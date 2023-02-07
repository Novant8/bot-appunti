import { addPurchase, getCourseNames } from "@libs/database";
import { creatorOnly } from "@libs/middleware";
import { MessageHandler } from ".";

export const handler : MessageHandler = async (bot) => {
    bot.command('addpurchase', creatorOnly, async (ctx) => {
        const args = ctx.message.text.split(' ');
        const tguser = parseInt(args[1]);
        const bought_courses = args.slice(2).map(c => c.replace(/_/g, ' '));

        if(isNaN(tguser))
            return ctx.reply('Invalid user provided.');

        if(bought_courses.length === 0)
            return ctx.reply('No courses provided.');

        const courses = await getCourseNames();
        if(bought_courses.some(c => !courses.includes(c)))
            return ctx.reply('One or more courses specified are invalid.');
        
        await addPurchase(tguser, bought_courses);
        
        return ctx.reply('Purchase added!');
    });
}