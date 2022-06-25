import { getCourseNames, getNoteDetails } from "@libs/database";
import { NewInvoiceParameters } from "telegraf/typings/telegram-types";
import { MessageHandler } from ".";

const getInvoiceParams = async (course : string) : Promise<NewInvoiceParameters> => {
    const { materia, prezzo, professori, anno, tecnologia, pagine, "note aggiuntive": note } = await getNoteDetails(course);
    return {
        title: `Appunti ${materia}`,
        description: `Appunti completi di ${materia} presi al Politecnico di Torino e scritti in ${tecnologia}. Prof. ${professori.join(', ')}, A.A ${anno}/${anno+1}, ${pagine} pagine. ${ note ? `Note aggiuntive: ${note}` : "" }`,
        payload: JSON.stringify({ course: materia }),
        provider_token: process.env.PAYMENT_TOKEN,
        currency: "EUR",
        prices: [
            {
                label: `Appunti ${materia}`,
                amount: prezzo*100
            }
        ]
    }
}

export const handler : MessageHandler = async (bot) => {
    const courses = await getCourseNames();
    bot.action(courses, async (ctx) => {
        const params = await getInvoiceParams(ctx.callbackQuery.data);
        await ctx.replyWithInvoice(params);
    })
}