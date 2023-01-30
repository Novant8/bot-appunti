import { BasicHandler, errorResponse, okResponse } from '@libs/api-gateway';
import { Telegraf } from 'telegraf';

type RecurringMessageBody = {
    message: string
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

export const main: BasicHandler = async (event) => {
  try {
    const { message }: RecurringMessageBody = JSON.parse(event.body);
    await bot.telegram.sendMessage(process.env.STAGE === 'prod' ? process.env.CHANNEL_ID : process.env.CREATOR_USERID, message, { parse_mode: 'Markdown' });

    return okResponse;
  } catch(e) {
    console.error(e);
    return errorResponse(e);
  }
};