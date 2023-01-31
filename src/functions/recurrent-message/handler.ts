import { BasicHandler, errorResponse, okResponse } from '@libs/api-gateway';
import { Telegraf } from 'telegraf';
import { verify, JsonWebTokenError } from 'jsonwebtoken'
import { MessageEntity } from 'telegraf/typings/core/types/typegram';

type RecurringMessageBody = {
    token: string
}

type JWTPayload = {
    text: string
    entities: MessageEntity[]
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

export const main: BasicHandler = async (event) => {
  try {
    const { token }: RecurringMessageBody = JSON.parse(event.body);
    const { text, entities } = verify(token, process.env.RECURRENT_MESSAGE_SECRET) as JWTPayload;
    await bot.telegram.sendMessage(process.env.CHANNEL_ID, text, { entities });

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