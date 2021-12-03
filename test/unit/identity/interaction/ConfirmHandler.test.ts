import { ConfirmHandler } from '../../../../src/identity/interaction/ConfirmHandler';
import type { Interaction } from '../../../../src/identity/interaction/InteractionHandler';
import type {
  InteractionCompleter,
} from '../../../../src/identity/interaction/util/InteractionCompleter';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { readJsonStream } from '../../../../src/util/StreamUtil';
import { createPostJsonOperation } from './email-password/handler/Util';

describe('A ConfirmHandler', (): void => {
  const webId = 'http://test.com/id#me';
  let oidcInteraction: Interaction;
  let interactionCompleter: jest.Mocked<InteractionCompleter>;
  let handler: ConfirmHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = { session: { accountId: webId }} as any;

    interactionCompleter = {
      handleSafe: jest.fn().mockResolvedValue('http://test.com/redirect'),
    } as any;

    handler = new ConfirmHandler(interactionCompleter);
  });

  it('requires an oidcInteraction with a defined session.', async(): Promise<void> => {
    oidcInteraction.session = undefined;
    await expect(handler.handle({ operation: {} as any, oidcInteraction }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the correct completion parameters.', async(): Promise<void> => {
    const operation = createPostJsonOperation({ remember: true });
    const response = await handler.handle({ operation, oidcInteraction });
    expect(response.metadata.contentType).toBe('application/json');
    await expect(readJsonStream(response.data)).resolves.toEqual({ location: 'http://test.com/redirect' });
    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(interactionCompleter.handleSafe).toHaveBeenLastCalledWith({ oidcInteraction, webId, shouldRemember: true });
  });
});
