import { describe, it, expect } from '@jest/globals';
import { createMockMessageUpdate, createMockTextMessage, mock_bot } from './util/mocks';

describe("Start command", () => {
    it('should reply with start message', async () => {
        const message = createMockTextMessage('/start');
        const update = createMockMessageUpdate(message);
    
        await mock_bot.handleUpdate(update);
    
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                chat_id: update.message.chat.id,
                text: expect.stringContaining(`Ciao ${update.message.from.first_name}`)
            })
        );
    
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                chat_id: process.env.CREATOR_USERID,
                text: expect.stringContaining('has started me')
            })
        );
    })

    it('should not work on groups', async () => {
        const message = createMockTextMessage('/start');
        message.chat.type = 'group';
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).not.toHaveBeenCalled();
    })
})