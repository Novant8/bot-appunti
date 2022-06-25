import { BasicHandler, okResponse } from '@libs/api-gateway';
import { Context, Telegraf } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.start((ctx: Context<Update>) => {
  return ctx.reply("Hello World!");
});

export const main: BasicHandler = async (event) => {
  await bot.handleUpdate(JSON.parse(event.body));
  return okResponse;
};