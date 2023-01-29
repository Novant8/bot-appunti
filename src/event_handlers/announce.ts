import { getFullNotesFileId } from "@libs/database";
import { creatorOnly, } from "@libs/middleware";
import { getCustomersTelegramUserIDs, groupBoughtNotesByUser } from "@libs/stripe";
import { Context } from "telegraf";
import { Update, User } from "telegraf/typings/core/types/typegram";
import { MessageHandler } from ".";

type AnnouncementParams = {
    [variable: string]: (userid: string) => Promise<string>
}

/**
 * Sends a given announcement message to all given users. Messages may contain variables that change depending on the user.
 * @param ctx Telegraf context.
 * @param userids List of users ids whom to send the message.
 * @param course Course of which notes will be attached to the message. If this value is falsy or "All", no notes will be attached.
 * @param message Message template which may contain variables.
 * @param params Object that maps variable names inserted in the message template with functions that allow to retrieve the value different for each user.
 */
const sendAnnouncement = async (ctx: Context<Update>, userids: string[], course: string, message: string, params: AnnouncementParams): Promise<void> => {
    if(!userids.length) {
        ctx.reply('No recipients were found for this announcement.');
        return;
    }
    
    const failed: string[] = [];
    const courseNotesFileID = course && course !== "All" && await getFullNotesFileId(course);

    for(const id of userids) {
        try {
            let compiledMessage = message;
            for(const variable in params)
                compiledMessage = compiledMessage.replace(variable, await params[variable](id))
            if(course && course !== "All")
                await ctx.telegram.sendDocument(id, courseNotesFileID, { caption: compiledMessage, parse_mode: 'Markdown' });              
            else
                await ctx.telegram.sendMessage(id, compiledMessage, { parse_mode: 'Markdown' });
        } catch (e) {
            failed.push(id);
            console.error(e);
        }
    }

    if(userids.length > failed.length)
        await ctx.reply(`Sent message to the following users:\n${userids.filter(id => failed.indexOf(id) < 0).join('\n')}`);

    if(failed.length > 0)
        await ctx.reply(`Could not send message to the following users:\n${failed.join('\n')}`);
}

export const handler : MessageHandler = async (bot) => {
    bot.command('announce', creatorOnly, async (ctx) => {
        const args = ctx.message.text.split(' ');
        const course = args[1].replace(/_/g, ' ');
        const after = new Date(args[2]);
        const message = ctx.message.text.substring(args[0].length + args[1].length + args[2].length + 2);
        
        console.log(course);

        if(isNaN(after.getTime()))
            return ctx.reply("Invalid date provided");

        if(message.length === 0)
            return ctx.reply("No message given");

        let userids: string[];
        if(process.env.STAGE === 'dev') {
            userids = [];
        } else if(course === "All") {
            userids =  await getCustomersTelegramUserIDs(after);
        } else {
            const userNotes = await groupBoughtNotesByUser(after);
            userids = Object.entries(userNotes).filter(([ _, bought ]) => bought.includes(course))
                                               .map(([ id, _ ]) => id);
        }
        userids.push(process.env.CREATOR_USERID);

        await sendAnnouncement(ctx, userids, course, message, {
            "%name%": async (userid) => {
                const user = await ctx.telegram.getChat(userid) as unknown as User;
                return user.first_name;
            }
        })
    })

    bot.command('askfeedback', creatorOnly, async (ctx) => {
        const args = ctx.message.text.split(' ');
        const after = new Date(args[1]);
        const message = 'Ciao %name%! Ricevi questo messaggio perchè nel periodo didattico passato hai acquistato gli appunti delle seguenti materie:\n%notes%\n\n'+
                        'Chiedo giusto due minuti del tuo tempo per scrivere un piccolo commento che descriva come li hai trovati, il che sarebbe molto d\'aiuto a me e ai posteri 🙏\n\n'+
                        'Per farlo puoi scrivere direttamente in questa chat, oppure scrivimi @sAlb98.\n\n'+
                        'Grazie e buon proseguimento di studi!\n'+
                        '- AV';
        
        if(isNaN(after.getTime()))
            return ctx.reply("Invalid date provided");

        if(message.length === 0)
            return ctx.reply("No message given");

        const userNotes = await groupBoughtNotesByUser(after);

        let userids: string[];
        if(process.env.STAGE === 'dev')
            userids = [ process.env.CREATOR_USERID ];
        else
            userids = Object.keys(userNotes);

        await sendAnnouncement(ctx, userids, null, message, {
            "%name%": async (userid) => {
                const user = await ctx.telegram.getChat(userid) as unknown as User;
                return user.first_name;
            },
            "%notes%": async (userid) => userNotes[userid].map(course => `- **${course}**`).join('\n')
        })
    })
};