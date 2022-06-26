import { getCourseNames, updateNotesFile } from "@libs/database";
import { Telegraf } from "telegraf";
import { MessageHandler } from ".";

const creatorOnly = Telegraf.filter(ctx => ctx.from.id === parseInt(process.env.CREATOR_USERID));

export const handler: MessageHandler = (bot) => {
    bot.on('document', creatorOnly, async (ctx) => {
        const course = ctx.message.caption;
        const courses = await getCourseNames();
        if(!courses.includes(course))
            return ctx.reply(`Corso \`${course}\` invalido. Corsi disponibili:\n${courses.map(c => `\`${c}\``).join('\n')}`, { parse_mode: 'Markdown' });
        await updateNotesFile(course, ctx.message.document.file_id);
        await ctx.reply(`Aggiornato documento di ${course}`);
    })
}