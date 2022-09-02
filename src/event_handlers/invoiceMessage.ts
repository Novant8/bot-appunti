import { getCourseNames, getNoteDetails } from "@libs/database";
import { creatorOnly } from "@libs/middleware";
import { Context, Markup } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { ExtraInvoice, NewInvoiceParameters } from "telegraf/typings/telegram-types";
import { MessageData, MessageHandler } from ".";

const courseList = async () : Promise<MessageData> => {
    const courseNames = await getCourseNames();
    return {
        text: "Clicca sul nome del corso per mandare il messaggio fattura",
        extras: Markup.inlineKeyboard(courseNames.map(course => Markup.button.callback(course, course)), { columns: 2 })
    };
}

const getInvoiceParams = async (course : string) : Promise<NewInvoiceParameters & ExtraInvoice> => {
    const { materia, prezzo, descrizione, url_foto } = await getNoteDetails(course);
    return {
        title: `Appunti ${materia}`,
        description: descrizione,
        photo_url: url_foto,
        photo_width: url_foto && 3753,
        photo_height: url_foto && 3528,
        payload: JSON.stringify({ course: materia }),
        provider_token: process.env.PAYMENT_TOKEN,
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

    bot.command('invoice', creatorOnly, async (ctx: Context<Update>) => {
        const { text, extras } = await courseList();
        await ctx.reply(text, extras);
    })

    bot.action(courses, async (ctx) => {
        const { reply_markup, ...params } = await getInvoiceParams(ctx.callbackQuery.data);
        await ctx.replyWithInvoice(params, { reply_markup });
    })
}