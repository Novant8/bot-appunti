import type { Telegraf } from 'telegraf';
import type { ExtraReplyMessage } from 'telegraf/typings/telegram-types';

export type MessageHandler = (bot: Telegraf) => void;

export type MessageData = {
    text: string,
    extras?: ExtraReplyMessage
}

import { handler as start } from './start';
import { handler as autoForward } from './autoForward';
import { handler as autoReply } from './autoReply';
import { handler as invoiceMessage } from './invoiceMessage';
import { handler as preCheckout } from './preCheckout';
import { handler as successfulPayment } from './successfulPayment';
import { handler as updateFile } from './updateFile';
import { handler as announce } from './announce';
/* import { handler as generateToken } from './generateToken'; // Disabled feature */
import { handler as deleteMessage } from './deleteMessage';
import { handler as addPurchase } from './addPurchase';

export const handlers : MessageHandler[] = [
    start,
    preCheckout,
    successfulPayment,
    autoForward,
    autoReply,
    invoiceMessage,
    updateFile,
    announce,
    // generateToken,
    deleteMessage,
    addPurchase
]