import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import { userIsCustomer } from '@libs/stripe';
import { createMockMessageUpdate, createMockTextMessage, mock_bot } from './util/mocks';

jest.mock('@libs/stripe');

describe("Auto reply", () => {
    const mock_userIsCustomer = userIsCustomer as jest.Mock<typeof userIsCustomer>;

    beforeAll(() => {
        mock_userIsCustomer
            .mockReset()
            .mockResolvedValue(false)
    })

    it("should reply to user", async () => {
        const message = createMockTextMessage("Hello World!");
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            "sendMessage",
            expect.objectContaining({
                chat_id: message.chat.id,
                text: expect.stringContaining("Ciao! Sono un bot e non posso risponderti")
            })
        );
    })

    it("should not reply to creator", async () => {
        const message = createMockTextMessage("Hello World!");
        message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
            "sendMessage",
            expect.objectContaining({
                chat_id: message.chat.id,
                text: expect.stringContaining("Ciao! Sono un bot e non posso risponderti")
            })
        );
    })

    it("should not reply to message in a group", async () => {
        const message = createMockTextMessage("Hello World!");
        message.chat.type = 'group';
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
            "sendMessage",
            expect.objectContaining({
                chat_id: message.chat.id,
                text: expect.stringContaining("Ciao! Sono un bot e non posso risponderti")
            })
        );
    })

    it("should not reply to customer (user who has bought notes)", async () => {
        mock_userIsCustomer.mockResolvedValueOnce(true);

        const message = createMockTextMessage("Hello World!");
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
            "sendMessage",
            expect.objectContaining({
                chat_id: message.chat.id,
                text: expect.stringContaining("Ciao! Sono un bot e non posso risponderti")
            })
        );
    })
})