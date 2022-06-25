import { MessageHandler } from ".";

export const handler: MessageHandler = (bot) => {
    bot.on("successful_payment", (ctx) => {
        return ctx.reply("Pagamento effettuato!");
    })
}