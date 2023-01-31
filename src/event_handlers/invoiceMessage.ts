import { getBundleDetails, getBundleNames, getCourseNames, getNoteDetails } from "@libs/database";
import { creatorOnly } from "@libs/middleware";
import probe from "probe-image-size";
import { Markup } from "telegraf";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { ExtraInvoice, NewInvoiceParameters } from "telegraf/typings/telegram-types";
import { MessageData, MessageHandler } from ".";


type InvoiceMessageOptions = {
    channel: boolean
}

export type InvoicePayload = {
    course?: string
    bundle?: string
}

const courseList = async (itemNames: string[], options: InvoiceMessageOptions) : Promise<MessageData> => {
    return {
        text: `Clicca sul nome del corso/bundle per mandare il messaggio fattura ${options.channel ? '(MODALITÀ CANALE)' : ''}`,
        extras: {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(itemNames.map(item => Markup.button.callback(item, item + (options.channel ? '-channel' : ''))), { columns: 2 })
        }
    };
}

const getInvoiceParams = async (course: string) : Promise<NewInvoiceParameters & ExtraInvoice> => {
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

const getInvoiceBundleParams = async (name: string) : Promise<NewInvoiceParameters & ExtraInvoice> => {
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
    const courses = await getCourseNames({ sorted: true });
    const bundles = await getBundleNames({ sorted: true });
    const bundles_displaynames = bundles.map(b => `Bundle ${b}`);

    const invoiceCommands = [ 'invoice' ];
    if(process.env.STAGE === 'prod')
        invoiceCommands.push('invoicechannel')

    bot.command(invoiceCommands, creatorOnly, async (ctx) => {
        const { text, extras } = await courseList([ ...courses, ...bundles_displaynames ], {
            channel: ctx.message.text.includes('channel')
        });
        await ctx.reply(text, extras);
    })

    const actions = [ ...courses, ...bundles_displaynames ];
    if(process.env.STAGE === 'prod')
        actions.push(...actions.map(item => item+'-channel'));

    bot.action(actions, creatorOnly, async (ctx) => {
        const channel = ctx.callbackQuery.data.includes('-channel');
        const item = ctx.callbackQuery.data.replace('-channel', '');

        const { reply_markup, ...params } = item.includes('Bundle') ? await getInvoiceBundleParams(item.substring(7)) : await getInvoiceParams(item);
        await ctx.telegram.sendInvoice(channel ? process.env.SHOP_CHANNEL : ctx.chat.id, params, { reply_markup });
        await ctx.answerCbQuery();
    })

    bot.command('invoicechannelall', creatorOnly, async (ctx) => {
        for(const course of courses) {
            const { reply_markup, ...params } = await getInvoiceParams(course);
            await ctx.telegram.sendInvoice(process.env.SHOP_CHANNEL, params, { reply_markup });
        }

        for(const bundle of bundles) {
            const { reply_markup, ...params } = await getInvoiceBundleParams(bundle);
            await ctx.telegram.sendInvoice(process.env.SHOP_CHANNEL, params, { reply_markup });
        }

        await ctx.reply("Done!");
    })
}