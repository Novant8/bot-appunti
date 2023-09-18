import { getFullNotesFileId } from "@libs/database";
import { creatorOnly, } from "@libs/middleware";
import { getCustomersTelegramUserIDs, groupBoughtNotesByUser } from "@libs/stripe";
import { Markup, TelegramError } from "telegraf";
import type { Context } from "telegraf";
import type { Message, Update, Chat } from "telegraf/types";
import type { ExtraReplyMessage } from "telegraf/typings/telegram-types";
import type { MessageHandler } from ".";
import wait from "wait";

type AnnouncementParams = {
    [variable: string]: (userid: number) => Promise<string>
}

/**
 * Sends a given announcement message to all given users. Messages may contain variables that change depending on the user.
 * @param ctx Telegraf context.
 * @param userids List of users ids whom to send the message.
 * @param course Course of which notes will be attached to the message. If this value is falsy or "All", no notes will be attached.
 * @param message Message template which may contain variables.
 * @param pollParams If a poll should be sent, the parameters to be passed to the `sendPoll` function.
 * @param params Object that maps variable names inserted in the message template with functions that allow to retrieve the value different for each user.
 */
const sendAnnouncement = async (ctx: Context<Update>, userids: number[], course: string, message: string, params: AnnouncementParams, extra: ExtraReplyMessage = {}): Promise<void> => {
    if(process.env.STAGE !=='dev' && userids.length == 1) {
        ctx.reply('No recipients were found for this announcement.');
        return;
    }
    
    const failed: number[] = [];
    const courseNotesFileID = course && course !== "All" && await getFullNotesFileId(course);

    for(const id of userids) {
        let retry_msg = true;
        while(retry_msg)
            try {
                let compiledMessage = message;
                for(const variable in params)
                    compiledMessage = compiledMessage.replace(new RegExp(variable, 'g'), await params[variable](id));
                let msg: Message;
                if(courseNotesFileID)
                    msg = await ctx.telegram.sendDocument(id, courseNotesFileID, { ...extra, caption: compiledMessage, parse_mode: 'Markdown' });              
                else
                    msg = await ctx.telegram.sendMessage(id, compiledMessage, { ...extra, parse_mode: 'Markdown' });
                console.log(`Sent message to user ${id}. Message ID: ${msg.message_id}.`);
                retry_msg = false;
            } catch (e) {
                if(e instanceof TelegramError && e.response.error_code === 429 && e.response.parameters.retry_after) {
                    console.log(`Encountered 429 error on user ${id}. Waiting for ${e.response.parameters.retry_after} seconds...`);
                    await wait(e.response.parameters.retry_after*1000);
                } else {
                    console.warn(`Failed to send message to user ${id}. ${e.message}`);
                    failed.push(id);
                    retry_msg = false;
                }
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
        const course = args[1]?.replace(/_/g, ' ') || '';
        const after_str = args[2] || '';
        const after = new Date(after_str);
        const message = ctx.message.text.substring(args[0].length + course.length + after_str.length + 3);

        if(!course)
            return ctx.reply("No course given")

        if(isNaN(after.getTime()))
            return ctx.reply("Invalid date provided");

        if(message.length === 0)
            return ctx.reply("No message given");

        let userids: number[];
        if(process.env.STAGE === 'dev') {
            userids = [];
        } else if(course === "All") {
            userids =  await getCustomersTelegramUserIDs(after);
        } else {
            const userNotes = await groupBoughtNotesByUser(after);
            userids = Object.entries(userNotes).filter(([ _, bought ]) => bought.includes(course))
                                               .map(([ id, _ ]) => parseInt(id));
        }
        userids.push(parseInt(process.env.CREATOR_USERID));

        await sendAnnouncement(ctx, userids, course, message, {
            "%name%": async (userid) => {
                const user = await ctx.telegram.getChat(userid) as Chat.PrivateGetChat;
                return user.first_name;
            }
        })
    })

    bot.command('askfeedback', creatorOnly, async (ctx) => {
        const args = ctx.message.text.split(' ');
        const from = new Date(args[1]);
        const to = args[2] && new Date(args[2]);
        const message = 'Ciao %name%! Ricevi questo messaggio perchè nel periodo didattico passato hai acquistato gli appunti delle seguenti materie:\n%notes%\n\n'+
                        'Se li hai usati per sostenere gli esami di questo periodo, chiedo giusto due minuti del tuo tempo per rispondere al sondaggio cliccando il bottone in fondo al messaggio, il che mi sarebbe molto d\'aiuto per migliorare gli appunti in futuro 🙏\n\n'+
                        'Grazie e buon proseguimento di studi!\n'+
                        '- AV';
        
        if(isNaN(from.getTime()) || (to && isNaN(to.getTime())))
            return ctx.reply("Invalid date(s) provided");

        if(to && from > to)
            return ctx.reply("Invalid date interval");

        const userNotes = await groupBoughtNotesByUser(from, to);

        let userids: number[];
        if(process.env.STAGE === 'dev')
            userids = [ parseInt(process.env.CREATOR_USERID) ];
        else
            userids = Object.keys(userNotes).map(id => parseInt(id));

        let survey_btn = Markup.inlineKeyboard([
            Markup.button.url("Compila il modulo", process.env.FORM_URL)
        ]);

        await sendAnnouncement(ctx, userids, null, message, {
            "%name%": async (userid) => {
                const user = await ctx.telegram.getChat(userid) as Chat.PrivateChat;
                return user.first_name;
            },
            "%notes%": async (userid) => userNotes[userid].map(course => `• *${course}*`).join('\n')
        }, survey_btn);

        /* Send generic message to creator */
        const generic_msg = 'Ciao! Ricevi questo messaggio perchè nel periodo didattico passato hai acquistato gli appunti di una o più materie.\n\n'+
                            'Se li hai usati per sostenere gli esami di questo periodo, chiedo giusto due minuti del tuo tempo per rispondere al sondaggio cliccando il bottone in fondo al messaggio, il che mi sarebbe molto d\'aiuto per migliorare gli appunti in futuro 🙏\n\n'+
                            'Grazie e buon proseguimento di studi!\n'+
                            '- AV';
        await ctx.telegram.sendMessage(process.env.CREATOR_USERID, generic_msg, { ...survey_btn, parse_mode: 'Markdown' });
    })
};