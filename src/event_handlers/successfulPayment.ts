import { getFullNotesFileId } from "@libs/database";
import { MessageHandler } from ".";

export const handler: MessageHandler = (bot) => {
    bot.on("successful_payment", async (ctx) => {
        const invoice_payload = JSON.parse(ctx.message.successful_payment.invoice_payload);
        const file_id = await getFullNotesFileId(invoice_payload.course);
        await ctx.replyWithDocument(file_id, {
            caption: `Grazie per l'acquisto! Ecco il file PDF con gli appunti di ${invoice_payload.course}. Per segnalare eventuali errori non esitare a contattare @sAlb98 su Telegram.`
        });
    })
}