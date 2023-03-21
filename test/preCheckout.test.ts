import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import { generatePreCheckoutUpdate, mock_bot } from './util/mocks';
import { getNoteDetails, getBundlePrice } from '@libs/database';
import { InvoicePayload } from '@event_handlers/invoiceMessage';

jest.mock('@libs/database');

describe("Pre-checkout query", () => {
    describe("Course", () => {
        const mock_getNoteDetails = getNoteDetails as jest.Mock<typeof getNoteDetails>;

        const invoice_payload: InvoicePayload = { course: "Analisi 1" };

        beforeAll(() => {
            mock_getNoteDetails
                .mockReset()
                .mockResolvedValue({
                    materia: "Analisi 1",
                    descrizione: "Appunti completi di Analisi 1",
                    prezzo: 1000
                })
        })

        it("should accept query", async () => {
            const update = generatePreCheckoutUpdate(1000, JSON.stringify(invoice_payload));
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'answerPreCheckoutQuery',
                expect.objectContaining({ ok: true })
            );
        })

        it("should reject query with outdated price (course)", async () => {
            const update = generatePreCheckoutUpdate(500, JSON.stringify(invoice_payload));
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'answerPreCheckoutQuery',
                expect.objectContaining({ ok: false })
            );
        })
    })

    describe("Bundle", () => {
        const mock_getBundlePrince = getBundlePrice as jest.Mock<typeof getBundlePrice>;

        const invoice_payload: InvoicePayload = { bundle: "Primo anno" };

        beforeAll(() => {
            mock_getBundlePrince
                .mockReset()
                .mockResolvedValue(4000)
        })

        it("should accept query", async () => {
            const update = generatePreCheckoutUpdate(4000, JSON.stringify(invoice_payload));
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'answerPreCheckoutQuery',
                expect.objectContaining({ ok: true })
            );
        })
    
        it("should reject query with outdated price", async () => {
            const update = generatePreCheckoutUpdate(3000, JSON.stringify(invoice_payload));
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'answerPreCheckoutQuery',
                expect.objectContaining({ ok: false })
            );
        })
    })

    it("should reject invalid payload", async () => {
        const update = generatePreCheckoutUpdate(3000, JSON.stringify({ i_am: "invalid" }));

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'answerPreCheckoutQuery',
            expect.objectContaining({ ok: false })
        );
    })

})