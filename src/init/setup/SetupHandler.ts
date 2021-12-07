import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { BaseInteractionHandler } from '../../identity/interaction/BaseInteractionHandler';
import type { RegistrationManager,
  RegistrationParams } from '../../identity/interaction/email-password/util/RegistrationManager';
import type { InteractionHandlerInput } from '../../identity/interaction/InteractionHandler';
import { getLoggerFor } from '../../logging/LogUtil';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { readJsonStream } from '../../util/StreamUtil';
import type { Initializer } from '../Initializer';

export interface SetupHandlerArgs {
  /**
   * Used for registering a pod during setup.
   */
  registrationManager?: RegistrationManager;
  /**
   * Initializer to call in case no registration procedure needs to happen.
   * This Initializer should make sure the necessary resources are there so the server can work correctly.
   */
  initializer?: Initializer;
}

/**
 * On POST requests, runs an initializer and/or performs a registration step, both optional.
 */
export class SetupHandler extends BaseInteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly registrationManager?: RegistrationManager;
  private readonly initializer?: Initializer;

  public constructor(args: SetupHandlerArgs) {
    super({});
    this.registrationManager = args.registrationManager;
    this.initializer = args.initializer;
  }

  protected async handlePost({ operation }: InteractionHandlerInput): Promise<Representation> {
    const json = operation.body.isEmpty ? {} : await readJsonStream(operation.body.data);

    // We want to initialize after the input has been validated, but before (potentially) writing a pod
    // since that might overwrite the initializer result
    if (json.initialize && !json.registration) {
      if (!this.initializer) {
        throw new NotImplementedHttpError('This server is not configured with a setup initializer.');
      }
      await this.initializer.handleSafe();
    }

    let output: Record<string, any> = {};
    // We only call the RegistrationManager when getting registration input.
    // This way it is also possible to set up a server without requiring registration parameters.
    let validated: RegistrationParams | undefined;
    if (json.registration) {
      if (!this.registrationManager) {
        throw new NotImplementedHttpError('This server is not configured to support registration during setup.');
      }
      // Validate the input JSON
      validated = this.registrationManager.validateInput(json, true);
      this.logger.debug(`Validated input: ${JSON.stringify(validated)}`);

      // Register and/or create a pod as requested. Potentially does nothing if all booleans are false.
      output = await this.registrationManager.register(validated, true);
    }

    // Add extra setup metadata
    output.initialize = Boolean(json.initialize);
    output.registration = Boolean(json.registration);
    this.logger.debug(`Output: ${JSON.stringify(output)}`);

    return new BasicRepresentation(JSON.stringify(output), APPLICATION_JSON);
  }
}
