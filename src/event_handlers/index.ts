import { Telegraf } from 'telegraf';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';

export type MessageHandler = (bot: Telegraf) => void;

export type MessageData = {
    text: string,
    extras?: ExtraReplyMessage
}

import { handler as start } from './start';
import { handler as noteDetails } from './noteDetails';
import { handler as preCheckout } from './preCheckout';
import { handler as successfulPayment } from './successfulPayment';

export const handlers : MessageHandler[] = [
    start,
    noteDetails,
    preCheckout,
    successfulPayment
]