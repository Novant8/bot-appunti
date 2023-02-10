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

        /* Notify creator of user */
        const creator_msg = `User [${[ctx.from.first_name, ctx.from.last_name].join(' ')}](tg://user?id=${ctx.from.id}) (ID *${ctx.from.id}*) has started me`;
        await ctx.telegram.sendMessage(process.env.CREATOR_USERID, creator_msg, { parse_mode: 'Markdown' });
    });
};