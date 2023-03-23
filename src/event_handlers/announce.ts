import { getFullNotesFileId } from "@libs/database";
import { creatorOnly, } from "@libs/middleware";
import { getCustomersTelegramUserIDs, groupBoughtNotesByUser } from "@libs/stripe";
import { TelegramError } from "telegraf";
import type { Context } from "telegraf";
import type { Message, Update, Chat } from "telegraf/types";
import type { ExtraPoll } from "telegraf/typings/telegram-types";
import type { MessageHandler } from ".";
import wait from "wait";

type AnnouncementParams = {
    [variable: string]: (userid: number) => Promise<string>
}

type PollParams = {
    question: string,
    options: string[],
    extras?: ExtraPoll
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
const sendAnnouncement = async (ctx: Context<Update>, userids: number[], course: string, message: string, params: AnnouncementParams, pollParams?: PollParams): Promise<void> => {
    if(process.env.STAGE !=='dev' && userids.length == 1) {
        ctx.reply('No recipients were found for this announcement.');
        return;
    }
    
    const failed: number[] = [];
    const courseNotesFileID = course && course !== "All" && await getFullNotesFileId(course);

    let poll: Message.PollMessage;
    if(pollParams)
        poll = await ctx.replyWithPoll(pollParams.question, pollParams.options, pollParams.extras);

    for(const id of userids) {
        let retry_msg = true;
        let retry_poll = !!poll;
        while(retry_msg || retry_poll)
            try {
                if(retry_msg) {
                    let compiledMessage = message;
                    for(const variable in params)
                        compiledMessage = compiledMessage.replace(new RegExp(variable, 'g'), await params[variable](id));
                    let msg: Message;
                    if(courseNotesFileID)
                        msg = await ctx.telegram.sendDocument(id, courseNotesFileID, { caption: compiledMessage, parse_mode: 'Markdown' });              
                    else
                        msg = await ctx.telegram.sendMessage(id, compiledMessage, { parse_mode: 'Markdown' });
                    console.log(`Sent message to user ${id}. Message ID: ${msg.message_id}.`);
                    retry_msg = false;
                }
                if(retry_poll) {
                    const msg = await ctx.telegram.forwardMessage(id, ctx.from.id, poll.message_id);
                    console.log(`Sent poll to user ${id}. Message ID: ${msg.message_id}.`);
                    retry_poll = false;
                }
            } catch (e) {
                if(e instanceof TelegramError && e.response.error_code === 429 && e.response.parameters.retry_after) {
                    console.log(`Encountered 429 error on user ${id}. Waiting for ${e.response.parameters.retry_after} seconds...`);
                    await wait(e.response.parameters.retry_after*1000);
                } else {
                    console.warn(`Failed to send message to user ${id}. ${e.message}`);
                    failed.push(id);
                    retry_msg = false;
                    retry_poll = false;
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
                        'Se li hai usati per sostenere gli esami di questo periodo, chiedo giusto un attimo del tuo tempo per rispondere al sondaggio qui sotto, il che sarebbe molto d\'aiuto a me e ai posteri 🙏\n\n'+
                        'Se vuoi inoltre scrivere un piccolo commento su come li hai trovati e su come eventualmente migliorarli, puoi farlo direttamente in questa chat oppure scrivimi @sAlb98.\n\n'+
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

        await sendAnnouncement(ctx, userids, null, message, {
            "%name%": async (userid) => {
                const user = await ctx.telegram.getChat(userid) as Chat.PrivateChat;
                return user.first_name;
            },
            "%notes%": async (userid) => userNotes[userid].map(course => `• *${course}*`).join('\n')
        }, {
            question: 'Quanto ti ritieni soddisfatto/a degli appunti acquistati?',
            options: [
                'Molto soddisfatto/a',
                'Soddisfatto/a',
                'Poco soddisfatto/a',
                'Per niente soddisfatto/a'
            ]
        });
    })
};