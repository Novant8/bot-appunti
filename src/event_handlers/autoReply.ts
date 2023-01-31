import { userIsCustomer } from "@libs/stripe";
import { MessageHandler } from ".";

export const handler : MessageHandler = async (bot) => {
    bot.on('message', async (ctx, next) => {
        if(
            ctx.from.id !== parseInt(process.env.CREATOR_USERID) && /* exceptCreator */
            !await userIsCustomer(ctx.from.id.toString())
        )
            return ctx.reply('Ciao! Sono un bot e non posso risponderti. Per chiedere informazioni scrivi @sAlb98.');
        return next();
    });
}