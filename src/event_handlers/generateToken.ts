import { sign } from "jsonwebtoken";
import { MessageHandler } from ".";
import { creatorOnly, privateOnly } from "@libs/middleware";

export const handler : MessageHandler = async (bot) => {
    bot.command('generatetoken', privateOnly, creatorOnly, async (ctx) => {
        const text = ctx.message.text.substring(ctx.message.entities[0].length);
        const entities = ctx.message.entities.slice(1).map(({ offset, ...e }) => ({ offset: offset-ctx.message.entities[0].length, ...e }));

        if(text.length === 0)
            return ctx.reply('No message given.');

        const token = sign({ text, entities }, process.env.RECURRENT_MESSAGE_SECRET);
        return ctx.reply(token, { entities: [{ offset: 0, length: token.length, type: 'pre' }] });
    });
}