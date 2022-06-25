import { MessageHandler } from ".";

export const handler: MessageHandler = (bot) => {
    bot.on("pre_checkout_query", (ctx) => ctx.answerPreCheckoutQuery(true))
}