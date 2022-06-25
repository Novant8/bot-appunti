import { BasicHandler, okResponse } from '@libs/api-gateway';
import { handlers } from '@event_handlers/index';
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

handlers.forEach(handler => handler(bot));

export const main: BasicHandler = async (event) => {
  await bot.handleUpdate(JSON.parse(event.body));
  return okResponse;
};