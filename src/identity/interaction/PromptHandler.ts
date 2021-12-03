import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { InteractionHandler } from './InteractionHandler';
import type { InteractionHandlerInput } from './InteractionHandler';
import type { InteractionRoute } from './routing/InteractionRoute';

/**
 * Redirects requests based on the OIDC Interaction prompt.
 * Errors in case no match was found.
 *
 * Instead of doing an actual redirect, a `location` field will be added the response
 * so the API can be used more easily.
 */
export class PromptHandler extends InteractionHandler {
  private readonly promptRoutes: Record<string, InteractionRoute>;

  public constructor(promptRoutes: Record<string, InteractionRoute>) {
    super();
    this.promptRoutes = promptRoutes;
  }

  public async handle({ operation, oidcInteraction }: InteractionHandlerInput): Promise<Representation> {
    // We also want to redirect on GET so no method check is needed
    const prompt = oidcInteraction?.prompt.name;
    if (prompt && this.promptRoutes[prompt]) {
      const location = this.promptRoutes[prompt].getPath();
      return new BasicRepresentation(JSON.stringify({ location }), operation.target, APPLICATION_JSON);
    }
    throw new BadRequestHttpError(`Unsupported prompt: ${prompt}`);
  }
}
