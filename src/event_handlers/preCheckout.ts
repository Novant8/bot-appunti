import { MessageHandler } from ".";
import { getNoteDetails } from "@libs/database";
import { InvoicePayload } from "./invoiceMessage";

export const handler: MessageHandler = (bot) => {
    bot.on("pre_checkout_query", async (ctx) => {
        const { course }: InvoicePayload = JSON.parse(ctx.preCheckoutQuery.invoice_payload)
        const { prezzo } = await getNoteDetails(course);

        // Compare database price with invoice amount: if different, then invoice is outdated
        if(ctx.preCheckoutQuery.total_amount === prezzo)
            await ctx.answerPreCheckoutQuery(true)
        else
            await ctx.answerPreCheckoutQuery(false, "La fattura si riferisce ad un prezzo non aggiornato.")
    })
}