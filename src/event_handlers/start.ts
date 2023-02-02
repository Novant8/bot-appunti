import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { MessageData, MessageHandler } from ".";
import { privateOnly } from "@libs/middleware";

/**
 * Generates message upon /start
 */
const startMessage = async (name: string) : Promise<MessageData> => {
    return {
        text: `Ciao ${name}!\nQuesto bot è stato progettato per inviare in privato i PDF degli appunti acquistati da [questo canale](${process.env.SHOP_CHANNEL_LINK}). Per informazioni o segnalazioni contatta @sAlb98.`,
        extras: { parse_mode: "Markdown" }
    };
}

export const handler : MessageHandler = (bot) => {
    bot.start(privateOnly, async (ctx: Context<Update>) => {
        const { text, extras } = await startMessage(ctx.from.first_name);
        await ctx.reply(text, extras);
    });
};