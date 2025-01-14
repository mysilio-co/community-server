import type { WellKnownBuilder } from '../../http/well-known/WellKnownBuilder';
import { joinUrl, trimTrailingSlashes } from '../../util/PathUtil';

export class JwksEndpointWellKnownBuilder implements WellKnownBuilder {
  private readonly jwksEndpoint: string;

  public constructor(
    baseUrl: string,
    jwksEndpointPath: string,
  ) {
    this.jwksEndpoint = trimTrailingSlashes(joinUrl(baseUrl, jwksEndpointPath));
  }

  public async getWellKnownSegment(): Promise<Record<string, any>> {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      jwks_endpoint: this.jwksEndpoint,
    };
  }
}
