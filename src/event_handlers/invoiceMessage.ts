import { getBundleDetails, getBundleNames, getCourseNames, getNoteDetails } from "@libs/database";
import { creatorOnly } from "@libs/middleware";
import { Markup } from "telegraf";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { ExtraInvoice, NewInvoiceParameters } from "telegraf/typings/telegram-types";
import { MessageData, MessageHandler } from ".";


type InvoiceMessageOptions = {
    test: boolean,
    channel: boolean
}

export type InvoicePayload = {
    course?: string
    bundle?: string
}

const courseList = async (itemNames: string[], options: InvoiceMessageOptions) : Promise<MessageData> => {
    return {
        text: `Clicca sul nome del corso/bundle per mandare il messaggio fattura (**MODALITÀ ${options.test ? 'TEST': `LIVE${options.channel ? ' - CANALE' : ''}`}**)`,
        extras: {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(itemNames.map(item => {
                const action = item + (options.test ? '-test' : '') + (options.channel ? '-channel' : '');
                return Markup.button.callback(item, action);
            }), { columns: 2 })
        }
    };
}

const getInvoiceParams = async (course: string, test: boolean) : Promise<NewInvoiceParameters & ExtraInvoice> => {
    const { materia, prezzo, descrizione, url_foto, url_anteprima } = await getNoteDetails(course);
    const buttons: InlineKeyboardButton[] = [ Markup.button.pay(`Acquista per €${(prezzo/100).toFixed(2).replace(".", ",")}`) ]
    if(url_anteprima)
        buttons.push(Markup.button.url('Anteprima', url_anteprima))
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
        ...Markup.inlineKeyboard(buttons, { columns: 1 })
    }
}

const getInvoiceBundleParams = async (name: string, test: boolean) : Promise<NewInvoiceParameters & ExtraInvoice> => {
    const { descrizione, materie_prezzi, url_foto } = await getBundleDetails(name);
    const prices = Object.values(materie_prezzi);
    const total = prices.reduce((tot, price) => tot + price, 0);
    return {
        title: `Bundle ${name}`,
        description: descrizione,
        photo_url: url_foto,
        photo_width: url_foto && 3753,
        photo_height: url_foto && (prices.length > 3 ? 3528 : 1764),
        payload: JSON.stringify({ bundle: name }),
        provider_token: test ? process.env.PAYMENT_TEST_TOKEN : process.env.PAYMENT_LIVE_TOKEN,
        currency: "EUR",
        prices: Object.entries(materie_prezzi).map(([ materia, amount ]) => ({
            label: `Appunti ${materia}`,
            amount
        })),
        ...Markup.inlineKeyboard([ Markup.button.pay(`Acquista per €${(total/100).toFixed(2).replace(".", ",")}`) ])
    }
}

export const handler : MessageHandler = async (bot) => {
    const courses = await getCourseNames();
    const bundles = await getBundleNames();
    const bundle_displaynames = bundles.map(b => `Bundle ${b}`);

    bot.command([ 'invoice', 'invoicechannel', 'invoicetest' ], creatorOnly, async (ctx) => {
        console.log("hello");
        const { text, extras } = await courseList([ ...courses, ...bundle_displaynames ], {
            test: ctx.message.text.includes('test'),
            channel: ctx.message.text.includes('channel')
        });
        await ctx.reply(text, extras);
    })

    let actions = [ ...courses, ...bundle_displaynames ].flatMap(item => [
        item,
        `${item}-test`,
        `${item}-channel`
    ]);
    bot.action(actions, creatorOnly, async (ctx) => {
        const channel = ctx.callbackQuery.data.includes('-channel');
        const test = ctx.callbackQuery.data.includes('-test');
        const item = ctx.callbackQuery.data.replace('-channel', '').replace('-test', '');

        const { reply_markup, ...params } = item.includes('Bundle') ? await getInvoiceBundleParams(item.substring(7), test) : await getInvoiceParams(item, test);
        ctx.telegram.sendInvoice(channel ? process.env.CHANNEL_ID : ctx.chat.id, params, { reply_markup });
    })
}