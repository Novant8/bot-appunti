import { jest, describe, it, expect, beforeAll } from '@jest/globals'
import { getBundleFullNotesFileIDs, getFullNotesFileId } from '@libs/database';
import { createMockMessageUpdate, createMockSuccessfulPaymentMessage, mock_bot } from './util/mocks';

jest.mock("@libs/database");

describe("Successful payment", () => {

    describe("Course", () => {
        const mock_getFullNotesFileId = getFullNotesFileId as jest.Mock<typeof getFullNotesFileId>;

        const invoice_payload = { course: "Analisi 1" };
        const fullNotes_id = '1234567890'

        beforeAll(() => {
            mock_getFullNotesFileId
                .mockReset()
                .mockResolvedValue(fullNotes_id)
        })

        it("should send full notes to customer", async () => {
            const message = createMockSuccessfulPaymentMessage(1000, JSON.stringify(invoice_payload));
            const update = createMockMessageUpdate(message);

            await mock_bot.handleUpdate(update);

            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendDocument',
                expect.objectContaining({
                    chat_id: update.message.chat.id,
                    caption: expect.stringContaining(invoice_payload.course),
                    document: fullNotes_id,
                })
            )
        })

    })

    describe("Bundle", () => {
        const mock_getBundleFullNotesFileIDs = getBundleFullNotesFileIDs as jest.Mock<typeof getBundleFullNotesFileIDs>;

        const invoice_payload = { bundle: "Primo anno" };
        const fullNotes_ids = [ '1234567890', '0987654321' ]

        beforeAll(() => {
            mock_getBundleFullNotesFileIDs
                .mockReset()
                .mockResolvedValue(fullNotes_ids)
        })

        it("should send all full notes to customer", async () => {
            const message = createMockSuccessfulPaymentMessage(4000, JSON.stringify(invoice_payload));
            const update = createMockMessageUpdate(message);

            await mock_bot.handleUpdate(update);

            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                "sendMediaGroup",
                expect.objectContaining({
                    chat_id: update.message.chat.id,
                    media: fullNotes_ids.map((media, i) => ({
                        type: "document",
                        media,
                        caption: i === fullNotes_ids.length - 1 ? expect.stringContaining(invoice_payload.bundle) : ''
                    }))
                })
            );
        })
    })

    it("should do nothing if payload is invalid", async () => {
        const message = createMockSuccessfulPaymentMessage(4000, JSON.stringify({ i_am: "invalid" }));
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).not.toHaveBeenCalled();
    })

})