import { MessageHandler } from ".";
import { getBundlePrice, getNoteDetails } from "@libs/database";
import { InvoicePayload } from "./invoiceMessage";

export const handler: MessageHandler = (bot) => {
    bot.on("pre_checkout_query", async (ctx) => {
        const { course, bundle }: InvoicePayload  = JSON.parse(ctx.preCheckoutQuery.invoice_payload)
        let price = 0;

        if(course)
            price = (await getNoteDetails(course)).prezzo;
        else if (bundle)
            price = await getBundlePrice(bundle);
        else
            return ctx.answerPreCheckoutQuery(false, "Invalid pre-checkout payload")

        // Compare database price with invoice amount: if different, then invoice is outdated
        if(ctx.preCheckoutQuery.total_amount === price)
            await ctx.answerPreCheckoutQuery(true)
        else
            await ctx.answerPreCheckoutQuery(false, "La fattura si riferisce ad un prezzo non aggiornato.")
    })
}