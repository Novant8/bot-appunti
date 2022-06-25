import { getCourseNames } from "@libs/database";
import { Context, Markup } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { MessageData, MessageHandler } from ".";

/**
 * Generates message upon /start
 */
const startMessage = async (name: string) : Promise<MessageData> => {
    const courseNames = await getCourseNames();
    return {
        text: `Ciao ${name}!\nQuali appunti vuoi consultare?`, // TODO: change text
        extras: Markup.inlineKeyboard(courseNames.map(course => Markup.button.callback(course, course)))
    };
}

export const handler : MessageHandler = (bot) => {
    bot.start(async (ctx: Context<Update>) => {
        const { text, extras } = await startMessage(ctx.from.first_name);
        await ctx.reply(text, extras);
    });
};