import { jest, describe, it, expect } from '@jest/globals';
import { TelegramError } from 'telegraf';
import { createMockMessageUpdate, createMockTextMessage, mock_bot } from './util/mocks';

describe("Delete message command", () => {

    it("should delete message given chat id", async () => {
        const chat_id = '1234567890';
        const message_id = 123;
        
        const message = createMockTextMessage(`/deletemessage https://t.me/${chat_id}/${message_id}`);
        message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'deleteMessage',
            { chat_id, message_id }
        );
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'sendMessage',
            {
                chat_id: message.chat.id,
                text: "Message deleted!"
            }
        );
    })

    it("should delete message given chat username", async () => {
        const chat_username = 'iAmAChat';
        const message_id = 123;
        
        const message = createMockTextMessage(`/deletemessage https://t.me/${chat_username}/${message_id}`);
        message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'deleteMessage',
            {
                chat_id: `@${chat_username}`,
                message_id
            }
        );
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'sendMessage',
            {
                chat_id: message.chat.id,
                text: "Message deleted!"
            }
        );
    })

    it("should delete message given telegram.me link without https://", async () => {
        const chat_id = '1234567890';
        const message_id = 123;
        
        const message = createMockTextMessage(`/deletemessage telegram.me/${chat_id}/${message_id}`);
        message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'deleteMessage',
            { chat_id, message_id }
        );
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'sendMessage',
            {
                chat_id: message.chat.id,
                text: "Message deleted!"
            }
        );
    })

    it("should notify failure in deleting message", async () => {
        const mock_callApi = mock_bot.telegram.callApi as jest.Mock<typeof mock_bot.telegram.callApi>;
        mock_callApi.mockRejectedValueOnce(new TelegramError({ error_code: 500, description: "Something bad happened" }));

        const chat_id = '1234567890';
        const message_id = 123;
        
        const message = createMockTextMessage(`/deletemessage https://t.me/${chat_id}/${message_id}`);
        message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'deleteMessage',
            { chat_id, message_id }
        );
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'sendMessage',
            {
                chat_id: message.chat.id,
                text: expect.stringContaining("Could not delete message")
            }
        );
    })

    it("should ignore user who is not creator", async () => {
        const chat_id = '1234567890';
        const message_id = 123;
        
        const message = createMockTextMessage(`/deletemessage https://t.me/${chat_id}/${message_id}`);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
            'deleteMessage',
            { chat_id, message_id }
        );
    })

    describe("Invalid links", () => {
        it("empty link", async () => {
            const chat_id = '1234567890';
            const message_id = 123;
    
            const message = createMockTextMessage(`/deletemessage`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'deleteMessage',
                {
                    chat_id: `@${chat_id}`,
                    message_id
                }
            );
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: "Invalid message link."
                }
            );
        })
    
        it("not a link", async () => {
            const chat_id = '1234567890';
            const message_id = 123;
    
            const message = createMockTextMessage(`/deletemessage i'm not a link!`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'deleteMessage',
                {
                    chat_id: `@${chat_id}`,
                    message_id
                }
            );
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: "Invalid message link."
                }
            );
        })
    
        it("invalid message id", async () => {
            const chat_id = '1234567890';
            const message_id = "i'm not an ID";
    
            const message = createMockTextMessage(`/deletemessage https://t.me/${chat_id}/${message_id}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'deleteMessage',
                {
                    chat_id: `@${chat_id}`,
                    message_id
                }
            );
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: "Invalid message link."
                }
            );
        })
    
        it("empty message id", async () => {
            const chat_id = '1234567890';
    
            const message = createMockTextMessage(`/deletemessage https://t.me/${chat_id}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'deleteMessage',
                expect.objectContaining({
                    chat_id: `@${chat_id}`
                })
            );
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: "Invalid message link."
                }
            );
        })

        it("t.me link without chat and message id", async () => {    
            const message = createMockTextMessage(`/deletemessage https://t.me/`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'deleteMessage',
                expect.anything()
            );
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: "Invalid message link."
                }
            );
        })
    })

})
