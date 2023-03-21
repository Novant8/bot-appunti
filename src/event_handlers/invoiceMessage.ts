import { getBundleDetails, getBundleNames, getCourseNames, getNoteDetails } from "@libs/database";
import probe from "probe-image-size";
import { Markup } from "telegraf";
import type { InlineKeyboardButton, InlineQueryResultArticle, InputInvoiceMessageContent } from "telegraf/typings/core/types/typegram";
import type { ExtraInvoice } from "telegraf/typings/telegram-types";
import type { MessageHandler } from ".";

export type InvoicePayload = {
    course?: string
    bundle?: string
}

const getInvoiceParams = async (course: string) : Promise<InputInvoiceMessageContent & ExtraInvoice> => {
    const { materia, prezzo, descrizione, url_foto, url_anteprima } = await getNoteDetails(course);
    const buttons: InlineKeyboardButton[] = [
        Markup.button.pay(`Acquista per €${(prezzo/100).toFixed(2).replace(".", ",")}`),
        Markup.button.url('Satispay/Paypal/Bonifico: contattami in privato', 'https://t.me/sAlb98')
    ]
    if(url_anteprima)
        buttons.push(Markup.button.url('Anteprima', url_anteprima));
    try {
        var { width, height } = await probe(url_foto);
    } catch {
        var width = 0;
        var height = 0;
    }
    return {
        title: `Appunti ${materia}`,
        description: descrizione,
        photo_url: url_foto,
        photo_width: width,
        photo_height: height,
        payload: JSON.stringify({ course: materia }),
        provider_token: process.env.PAYMENT_TOKEN,
        currency: "EUR",
        prices: [
            {
                label: `Appunti ${materia}`,
                amount: prezzo
            }
        ],
        disable_notification: true,
        ...Markup.inlineKeyboard(buttons, { columns: 1 })
    }
}

const getInvoiceBundleParams = async (name: string) : Promise<InputInvoiceMessageContent & ExtraInvoice> => {
    const { descrizione, materie_prezzi, url_foto } = await getBundleDetails(name);
    const prices = Object.values(materie_prezzi);
    const total = prices.reduce((tot, price) => tot + price, 0);
    try {
        var { width, height } = await probe(url_foto);
    } catch {
        var width = 0;
        var height = 0;
    }
    return {
        title: `Bundle ${name}`,
        description: descrizione,
        photo_url: url_foto,
        photo_width: width,
        photo_height: height,
        payload: JSON.stringify({ bundle: name }),
        provider_token: process.env.PAYMENT_TOKEN,
        currency: "EUR",
        prices: Object.entries(materie_prezzi).map(([ materia, amount ]) => ({
            label: `Appunti ${materia}`,
            amount
        })),
        disable_notification: true,
        ...Markup.inlineKeyboard([
            Markup.button.pay(`Acquista per €${(total/100).toFixed(2).replace(".", ",")}`),
            Markup.button.url('Satispay/Paypal/Bonifico: contattami in privato', 'https://t.me/sAlb98')
        ], { columns: 1 })
    }
}

export const handler : MessageHandler = async (bot) => {
    bot.on('inline_query', async (ctx) => {
        /* Do not generate test invoices for users who are not the creator on test mode (no free notes for u) */
        if(process.env.STAGE === 'dev' && ctx.from.id.toString() !== process.env.CREATOR_USERID)
            return ctx.answerInlineQuery([]);

        let courses = await getCourseNames({ sorted: true });
        let bundles = await getBundleNames({ sorted: true });

        /* Filter courses and bundles by user query */
        if(ctx.inlineQuery.query.length > 0) {
            courses = courses.filter(c => `appunti ${c.toLowerCase()}`.includes(ctx.inlineQuery.query.toLowerCase()));
            bundles = bundles.filter(b => `bundle ${b.toLowerCase()}`.includes(ctx.inlineQuery.query.toLowerCase()));
        }

        /* Generate invoice messages for each unfiltered course/bundle */
        const results = await Promise.all([
            ...courses.map(async course => {
                const { reply_markup, ...invoice_params } = await getInvoiceParams(course);

                return {
                    type: 'article',
                    id: course,
                    title: `Appunti ${course}`,
                    description: invoice_params.description,
                    input_message_content: invoice_params,
                    reply_markup
                } as InlineQueryResultArticle;
            }),
            ...bundles.map(async bundle => {
                const { reply_markup, ...invoice_params } = await getInvoiceBundleParams(bundle);

                return {
                    type: 'article',
                    id: `bundle-${bundle}`,
                    title: `Bundle ${bundle}`,
                    description: invoice_params.description,
                    input_message_content: invoice_params,
                    reply_markup
                } as InlineQueryResultArticle;
            })
        ]);

        return ctx.answerInlineQuery(results);
    });
}