import { Telegraf } from 'telegraf';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';

export type MessageHandler = (bot: Telegraf) => void;

export type MessageData = {
    text: string,
    extras?: ExtraReplyMessage
}

import { handler as start } from './start';

export const handlers : MessageHandler[] = [
    start
]