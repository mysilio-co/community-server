import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { BaseInteractionHandler } from '../../../../src/identity/interaction/BaseInteractionHandler';
import type {
  InteractionHandlerInput,
  InteractionOperation,
} from '../../../../src/identity/interaction/InteractionHandler';
import { APPLICATION_JSON } from '../../../../src/util/ContentTypes';
import { readJsonStream } from '../../../../src/util/StreamUtil';

class DummyBaseInteractionHandler extends BaseInteractionHandler {
  public constructor() {
    super({ view: 'view' });
  }

  public async handlePost(input: InteractionHandlerInput): Promise<Representation> {
    return new BasicRepresentation(JSON.stringify({ data: 'data' }), input.operation.target, APPLICATION_JSON);
  }
}

describe('A BaseInteractionHandler', (): void => {
  const handler = new DummyBaseInteractionHandler();

  it('returns the view on GET requests.', async(): Promise<void> => {
    const operation: InteractionOperation = {
      method: 'GET',
      target: { path: 'http://example.com/foo' },
      body: new BasicRepresentation(),
      preferences: {},
    };
    const result = await handler.handle({ operation });
    await expect(readJsonStream(result.data)).resolves.toEqual({ view: 'view' });
  });

  it('calls the handlePost function on POST requests.', async(): Promise<void> => {
    const operation: InteractionOperation = {
      method: 'POST',
      target: { path: 'http://example.com/foo' },
      body: new BasicRepresentation(),
      preferences: {},
    };
    const result = await handler.handle({ operation });
    await expect(readJsonStream(result.data)).resolves.toEqual({ data: 'data' });
  });
});
