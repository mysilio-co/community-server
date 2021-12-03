import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { BaseInteractionHandler } from './BaseInteractionHandler';
import type { InteractionHandlerInput } from './InteractionHandler';
import type { InteractionCompleterInput, InteractionCompleter } from './util/InteractionCompleter';

/**
 * Abstract extension of {@link BaseInteractionHandler} for handlers that need to call an {@link InteractionCompleter}.
 * This is required by handlers that handle IDP behaviour
 * and need to complete an OIDC interaction by redirecting back to the client,
 * such as when logging in.
 *
 * Calls the InteractionCompleter with the results returned by the helper function
 * and throw a corresponding {@link FoundHttpError}.
 *
 * Instead of doing an actual redirect, a `location` field will be added the response
 * so the API can be used more easily.
 */
export abstract class CompletingInteractionHandler extends BaseInteractionHandler {
  protected readonly interactionCompleter: InteractionCompleter;

  protected constructor(view: Record<string, unknown>, interactionCompleter: InteractionCompleter) {
    super(view);
    this.interactionCompleter = interactionCompleter;
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    await super.canHandle(input);
    if (input.operation.method === 'POST' && !input.oidcInteraction) {
      throw new BadRequestHttpError(
        'This action can only be performed as part of an OIDC authentication flow.',
        { errorCode: 'E0002' },
      );
    }
  }

  public async handlePost(input: InteractionHandlerInput): Promise<Representation> {
    // Interaction is defined due to canHandle call
    const parameters = await this.getCompletionParameters(input as Required<InteractionHandlerInput>);
    const location = await this.interactionCompleter.handleSafe(parameters);
    return new BasicRepresentation(JSON.stringify({ location }), input.operation.target, APPLICATION_JSON);
  }

  /**
   * Generates the parameters necessary to call an InteractionCompleter.
   * The input parameters are the same that the `handlePost` function was called with.
   */
  protected abstract getCompletionParameters(input: Required<InteractionHandlerInput>):
  Promise<InteractionCompleterInput>;
}
