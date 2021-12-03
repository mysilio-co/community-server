import { FixedInteractionHandler } from '../../../../src/identity/interaction/FixedInteractionHandler';
import type { InteractionOperation } from '../../../../src/identity/interaction/InteractionHandler';
import { readJsonStream } from '../../../../src/util/StreamUtil';

describe('A FixedInteractionHandler', (): void => {
  const json = { data: 'data' };
  const operation: InteractionOperation = { target: { path: 'http://example.com/test/' }} as any;
  const handler = new FixedInteractionHandler(json);

  it('returns the given JSON as response.', async(): Promise<void> => {
    const response = await handler.handle({ operation });
    await expect(readJsonStream(response.data)).resolves.toEqual(json);
    expect(response.metadata.contentType).toBe('application/json');
  });
});
