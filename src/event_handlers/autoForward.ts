import { exceptCreator } from "@libs/middleware";
import { MessageHandler } from ".";

export const handler : MessageHandler = async (bot) => {
    bot.on('message', exceptCreator, async (ctx) => ctx.forwardMessage(process.env.CREATOR_USERID));
}