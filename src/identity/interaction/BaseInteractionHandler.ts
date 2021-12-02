import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import type { InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';

/**
 * Abstract implementation for handlers that always return a fixed JSON view on a GET.
 * Post requests get passed to an abstract function.
 */
export abstract class BaseInteractionHandler extends InteractionHandler {
  private readonly view: string;

  protected constructor(view: Record<string, unknown>) {
    super();
    this.view = JSON.stringify(view);
  }

  public async handle(input: InteractionHandlerInput): Promise<Representation> {
    if (input.operation.method === 'GET') {
      return new BasicRepresentation(this.view, input.operation.target, APPLICATION_JSON);
    }
    return this.handlePost(input);
  }

  /**
   * Function that will be called for POST requests.
   * Input data remains unchanged.
   */
  protected abstract handlePost(input: InteractionHandlerInput): Promise<Representation>;
}
