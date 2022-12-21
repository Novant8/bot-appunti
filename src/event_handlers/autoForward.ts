import { TelegramError } from "telegraf";
import { MessageHandler } from ".";

export const handler : MessageHandler = async (bot) => {
    bot.on('message', async (ctx, next) => {
        if(ctx.from.id !== parseInt(process.env.CREATOR_USERID)) /* exceptCreator */
            try {
                await ctx.forwardMessage(process.env.CREATOR_USERID);
            } catch(e) {
                /* Message can be an update that can't be forwarded */
                if(!(e instanceof TelegramError) || !e.response.description.includes("message can't be forwarded"))
                    throw e;
            }
        await next();
    });
}