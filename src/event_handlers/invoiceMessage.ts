import { getCourseNames, getNoteDetails } from "@libs/database";
import { creatorOnly } from "@libs/middleware";
import { Context, Markup } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { ExtraInvoice, NewInvoiceParameters } from "telegraf/typings/telegram-types";
import { MessageData, MessageHandler } from ".";

type InvoiceMessageOptions = {
    test: boolean,
    channel: boolean
}

export type InvoicePayload = {
    course: string
}

const courseList = async (courseNames: string[], options: InvoiceMessageOptions) : Promise<MessageData> => {
    return {
        text: `Clicca sul nome del corso per mandare il messaggio fattura (**${options.test ? 'MODALITÀ TEST': `MODALITÀ LIVE${options.channel ? ' - CANALE' : ''}`}**)`,
        extras: {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(courseNames.map(course => Markup.button.callback(course, course + (options.test ? '-test' : '') + (options.channel ? '-channel' : ''))), { columns: 2 })
        }
    };
}

const getInvoiceParams = async (course: string) : Promise<NewInvoiceParameters & ExtraInvoice> => {
    const test = course.includes('-test');
    const { materia, prezzo, descrizione, url_foto } = await getNoteDetails(course.replace('-test', ''));
    return {
        title: `Appunti ${materia}`,
        description: descrizione,
        photo_url: url_foto,
        photo_width: url_foto && 3753,
        photo_height: url_foto && 3528,
        payload: JSON.stringify({ course: materia }),
        provider_token: test ? process.env.PAYMENT_TEST_TOKEN : process.env.PAYMENT_LIVE_TOKEN,
        currency: "EUR",
        prices: [
            {
                label: `Appunti ${materia}`,
                amount: prezzo
            }
        ],
        ...Markup.inlineKeyboard([ Markup.button.pay(`Acquista per €${(prezzo/100).toFixed(2).replace(".", ",")}`) ])
    }
}

export const handler : MessageHandler = async (bot) => {
    const courses = await getCourseNames();

    bot.command('invoicechannel', creatorOnly, async (ctx: Context<Update>) => {
        const { text, extras } = await courseList(courses, { test: false, channel: true });
        await ctx.reply(text, extras);
    })

    bot.command('invoicetest', creatorOnly, async (ctx: Context<Update>) => {
        const { text, extras } = await courseList(courses, { test: true, channel: false });
        await ctx.reply(text, extras);
    })

    bot.command('invoice', creatorOnly, async (ctx: Context<Update>) => {
        const { text, extras } = await courseList(courses, { test: false, channel: false });
        await ctx.reply(text, extras);
    })

    const actions = courses.flatMap(course => [
        course,
        `${course}-test`,
        `${course}-channel`
    ]);
    bot.action(actions, async (ctx) => {
        const channel = ctx.callbackQuery.data.includes('-channel');
        const { reply_markup, ...params } = await getInvoiceParams(ctx.callbackQuery.data.replace('-channel', ''));
        ctx.telegram.sendInvoice(channel ? process.env.CHANNEL_ID : ctx.chat.id, params, { reply_markup });
    })
}