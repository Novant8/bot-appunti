import { TelegramError } from "telegraf";
import { MessageHandler } from ".";
import { creatorOnly } from "@libs/middleware";

export const handler : MessageHandler = (bot) => {
    bot.command('deletemessage', creatorOnly, async (ctx) => {
        const splitLink = ctx.message.text.split(' ')[1]?.split('/');

        if(typeof splitLink === 'undefined')
            return ctx.reply('No message link provided.');

        const chat = '@'+splitLink[splitLink.length-2];
        const msgid = parseInt(splitLink[splitLink.length-1]);

        if(isNaN(msgid))
            return ctx.reply("Invalid message link.");

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