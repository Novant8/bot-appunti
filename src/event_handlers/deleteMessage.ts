import { TelegramError } from "telegraf";
import type { MessageHandler } from ".";
import { creatorOnly } from "@libs/middleware";

export const handler : MessageHandler = (bot) => {
    bot.command('deletemessage', creatorOnly, async (ctx) => {
        const regex = /(https:\/\/)?t(elegram)?.me\/(\w+)\/([0-9]+)/;
        const args = ctx.message.text.split(' ');
        const link = args[1];

        const matches = link?.match(regex);
        
        if(!matches)
            return ctx.reply("Invalid message link.");

        const chat = isNaN(parseInt(matches[3])) ? `@${matches[3]}` : matches[3];
        const msgid = parseInt(matches[4]);

        try {
            await ctx.telegram.deleteMessage(chat, msgid);
            return ctx.reply("Message deleted!");
        } catch(e) {
            if(e instanceof TelegramError)
                return ctx.reply(`Could not delete message: ${e.description}`);
            throw e;
        }
    });
}