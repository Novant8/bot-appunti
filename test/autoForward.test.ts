import { describe, it, expect } from '@jest/globals';
import { createMockMessageUpdate, createMockSuccessfulPaymentMessage, createMockTextMessage, mock_bot } from './util/mocks';

describe("Auto forward", () => {
    
    it("should forward message to creator", async () => {
        const message = createMockTextMessage("Hello World!");
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);
        
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'forwardMessage',
            {
                chat_id: process.env.CREATOR_USERID,
                from_chat_id: message.chat.id,
                message_id: message.message_id
            }
        );
    })

    it("should not forward message by creator", async () => {
        const message = createMockTextMessage("Hello World!");
        message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);
        
        expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
            'forwardMessage',
            {
                chat_id: process.env.CREATOR_USERID,
                from_chat_id: message.chat.id,
                message_id: message.message_id
            }
        );
    })

    it("should not forward un-forwardable message", async () => {
        const message = createMockSuccessfulPaymentMessage(1000, JSON.stringify({ course: "Analisi 1" }));
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);
        
        expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
            'forwardMessage',
            {
                chat_id: process.env.CREATOR_USERID,
                from_chat_id: message.chat.id,
                message_id: message.message_id
            }
        );
    })

    it("should not forward /start", async () => {
        const message = createMockTextMessage("/start");
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);
        
        expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
            'forwardMessage',
            {
                chat_id: process.env.CREATOR_USERID,
                from_chat_id: message.chat.id,
                message_id: message.message_id
            }
        );
    })

    it("should forward creator-level command from user", async () => {
        const message = createMockTextMessage("/announce");
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'forwardMessage',
            {
                chat_id: process.env.CREATOR_USERID,
                from_chat_id: message.chat.id,
                message_id: message.message_id
            }
        );
    })

})