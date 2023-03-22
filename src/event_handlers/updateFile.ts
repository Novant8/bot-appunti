import { getCourseNames, updateNotesFile } from "@libs/database";
import { creatorOnly } from "@libs/middleware";
import type { MessageHandler } from ".";
import { message } from "telegraf/filters";
import type { Message } from "telegraf/types";

export const handler: MessageHandler = (bot) => {
    bot.on(message('document'), creatorOnly, async (ctx) => {
        const course = (ctx.message as Message.DocumentMessage ).caption;
        const courses = await getCourseNames();
        if(!courses.includes(course))
            return ctx.reply(`Corso \`${course}\` invalido. Corsi disponibili:\n${courses.map(c => `\`${c}\``).join('\n')}`, { parse_mode: 'Markdown' });
        await updateNotesFile(course, ctx.message.document.file_id);
        await ctx.reply(`Aggiornato documento di ${course}`);
    })
}