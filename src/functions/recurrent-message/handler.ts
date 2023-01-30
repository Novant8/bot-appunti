import { BasicHandler, errorResponse, okResponse } from '@libs/api-gateway';
import { Telegraf } from 'telegraf';
import { verify, JsonWebTokenError } from 'jsonwebtoken'

type RecurringMessageBody = {
    token: string
}

type JWTPayload = {
    message: string
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

export const main: BasicHandler = async (event) => {
  try {
    const { token }: RecurringMessageBody = JSON.parse(event.body);
    const { message } = verify(token, process.env.RECURRENT_MESSAGE_SECRET) as JWTPayload;
    await bot.telegram.sendMessage(process.env.STAGE === 'prod' ? process.env.CHANNEL_ID : process.env.CREATOR_USERID, message, { parse_mode: 'Markdown' });

    return okResponse;
  } catch(e) {
    
    if(e instanceof JsonWebTokenError)
        return {
            statusCode: 401,
            body: "Message could not be verified."
        }

    console.error(e);
    return errorResponse(e);
  }
};