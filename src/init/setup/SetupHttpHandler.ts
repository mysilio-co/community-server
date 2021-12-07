import { OkResponseDescription } from '../../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../../http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { InteractionHandler, InteractionOperation } from '../../identity/interaction/InteractionHandler';
import { getLoggerFor } from '../../logging/LogUtil';
import type { OperationHttpHandlerInput } from '../../server/OperationHttpHandler';
import { OperationHttpHandler } from '../../server/OperationHttpHandler';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { APPLICATION_JSON, TEXT_HTML } from '../../util/ContentTypes';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';

export interface SetupHttpHandlerArgs {
  /**
   * Used for converting the input data.
   */
  converter: RepresentationConverter;
  /**
   * Handles the requests.
   */
  handler: InteractionHandler;
  /**
   * Key that is used to store the boolean in the storage indicating setup is finished.
   */
  storageKey: string;
  /**
   * Used to store setup status.
   */
  storage: KeyValueStorage<string, boolean>;
  /**
   * Renders the main view.
   */
  templateEngine: TemplateEngine;
}

/**
 * Handles the initial setup of a server.
 * Will capture all requests until setup is finished,
 * this to prevent accidentally running unsafe servers.
 *
 * GET requests will return the view template which should contain the setup information for the user.
 * POST requests will be sent to the InteractionHandler.
 * After successfully completing a POST request this handler will disable itself and become unreachable.
 * All other methods will be rejected.
 */
export class SetupHttpHandler extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly handler: InteractionHandler;
  private readonly converter: RepresentationConverter;
  private readonly storageKey: string;
  private readonly storage: KeyValueStorage<string, boolean>;
  private readonly templateEngine: TemplateEngine;

  public constructor(args: SetupHttpHandlerArgs) {
    super();

    this.handler = args.handler;
    this.converter = args.converter;
    this.storageKey = args.storageKey;
    this.storage = args.storage;
    this.templateEngine = args.templateEngine;
  }

  public async handle({ operation }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    if (operation.method !== 'GET' && operation.method !== 'POST') {
      throw new MethodNotAllowedHttpError();
    }

    if (operation.method === 'GET') {
      const result = await this.templateEngine.render({});
      const representation = new BasicRepresentation(result, operation.target, TEXT_HTML);
      return new OkResponseDescription(representation.metadata, representation.data);
    }

    // Convert input data to JSON
    // Allows us to still support form data
    if (operation.body.metadata.contentType) {
      const args = {
        representation: operation.body,
        preferences: { type: { [APPLICATION_JSON]: 1 }},
        identifier: operation.target,
      };
      operation = {
        ...operation,
        body: await this.converter.handleSafe(args),
      };
    }

    const input = { operation: operation as InteractionOperation };
    const representation = await this.handler.handleSafe(input);
    await this.storage.set(this.storageKey, true);

    return new OkResponseDescription(representation.metadata, representation.data);
  }
}
