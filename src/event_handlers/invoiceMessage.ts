import { getCourseNames, getNoteDetails } from "@libs/database";
import { creatorOnly } from "@libs/middleware";
import { Context, Markup } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { NewInvoiceParameters } from "telegraf/typings/telegram-types";
import { MessageData, MessageHandler } from ".";

const courseList = async () : Promise<MessageData> => {
    const courseNames = await getCourseNames();
    return {
        text: "Clicca sul nome del corso per mandare il messaggio fattura",
        extras: Markup.inlineKeyboard(courseNames.map(course => Markup.button.callback(course, course)))
    };
}

const getInvoiceParams = async (course : string) : Promise<NewInvoiceParameters> => {
    const { materia, prezzo, descrizione } = await getNoteDetails(course);
    return {
        title: `Appunti ${materia}`,
        description: descrizione,
        payload: JSON.stringify({ course: materia }),
        provider_token: process.env.PAYMENT_TOKEN,
        currency: "EUR",
        prices: [
            {
                label: `Appunti ${materia}`,
                amount: prezzo
            }
        ]
    }
}

export const handler : MessageHandler = async (bot) => {
    const courses = await getCourseNames();

    bot.command('invoice', creatorOnly, async (ctx: Context<Update>) => {
        const { text, extras } = await courseList();
        await ctx.reply(text, extras);
    })

    bot.action(courses, async (ctx) => {
        const params = await getInvoiceParams(ctx.callbackQuery.data);
        await ctx.replyWithInvoice(params);
    })
}