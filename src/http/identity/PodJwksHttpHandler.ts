import type { JwksKeyGenerator } from '../../identity/configuration/JwksKeyGenerator';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import { HttpHandler } from '../../server/HttpHandler';

export const POD_JWKS_KEY = 'POD_JWKS';

export class PodJwksHttpHandler extends HttpHandler {
  public constructor(
    private readonly jwksKeyGenerator: JwksKeyGenerator,
  ) {
    super();
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    const jwksPublic = await this.jwksKeyGenerator.getPublicJwks(POD_JWKS_KEY);

    input.response.setHeader('Content-Type', 'application/ld+json');
    input.response.write(JSON.stringify(jwksPublic));
    input.response.end();
  }
}
