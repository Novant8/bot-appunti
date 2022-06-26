import { Telegraf } from "telegraf";

export const creatorOnly = Telegraf.filter(ctx => ctx.from.id === parseInt(process.env.CREATOR_USERID));