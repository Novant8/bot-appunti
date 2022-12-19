import { MessageHandler } from ".";

export const handler : MessageHandler = async (bot) => {
    bot.on('message', async (ctx, next) => {
        if(ctx.from.id !== parseInt(process.env.CREATOR_USERID)) /* exceptCreator */
            await ctx.forwardMessage(process.env.CREATOR_USERID);
        await next();
    });
}