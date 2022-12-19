import { getBundleFullNotesFileIDs, getFullNotesFileId } from "@libs/database";
import { MessageHandler } from ".";
import { InvoicePayload } from "./invoiceMessage";

export const handler: MessageHandler = (bot) => {
    bot.on("successful_payment", async (ctx) => {
        const invoice_payload: InvoicePayload = JSON.parse(ctx.message.successful_payment.invoice_payload);

        if(invoice_payload.course) {
            const file_id = await getFullNotesFileId(invoice_payload.course);
            await ctx.replyWithDocument(file_id, {
                caption: `Grazie per l'acquisto! Ecco il file PDF con gli appunti di ${invoice_payload.course}. Per segnalare eventuali errori non esitare a contattare @sAlb98 su Telegram.`
            });
        } else if (invoice_payload.bundle) {
            const file_ids = await getBundleFullNotesFileIDs(invoice_payload.bundle);
            await ctx.replyWithMediaGroup(file_ids.map((media, i) => ({
                type: 'document',
                media,
                caption: i === file_ids.length-1 ? `Grazie per l'acquisto! Ecco i file PDF del bundle ${invoice_payload.bundle}. Per segnalare eventuali errori non esitare a contattare @sAlb98 su Telegram.` : ''
            })))
        }
    })
}