import { Telegraf } from "telegraf";

export const creatorOnly = Telegraf.drop(ctx => ctx.from.id !== parseInt(process.env.CREATOR_USERID));
export const exceptCreator = Telegraf.drop(ctx => ctx.from.id === parseInt(process.env.CREATOR_USERID));
export const privateOnly = Telegraf.drop(ctx => ctx.chat.type !== 'private');