import { jest } from '@jest/globals';
import { Telegraf, Telegram } from "telegraf";
import { handlers } from '@event_handlers/index';
import type { Chat, Message, MessageEntity, Update, User } from 'telegraf/types'

const person: User = {
    id: 1,
    is_bot: false,
    first_name: "John Doe"
}

const chat: Chat.PrivateChat = {
    ...person,
    type: "private"
}

export function createMockMessageUpdate<M extends Message>(message: Update.New & Update.NonChannel & M): Update.MessageUpdate<M> {
    return {
        update_id: 1,
        message
    }
}

export function generatePreCheckoutUpdate(total_amount: number, invoice_payload: string): Update.PreCheckoutQueryUpdate {
    return {
        update_id: 1,
        pre_checkout_query: {
            id: "query",
            from: {...person},
            currency: "EUR",
            total_amount,
            invoice_payload
        }
    }
}

export function createMockTextMessage(text: string): Update.New & Update.NonChannel & Message.TextMessage {    
    let commandEntity: MessageEntity;
    if(text.startsWith('/')) {
        const command = text.split(' ')[0];
        commandEntity = {
            type: 'bot_command',
            offset: 0,
            length: command.length
        }
    }
    
    return {
        message_id: 1,
        chat: {...chat},
        from: {...person},
        date: Date.now(),
        text,
        entities: [ commandEntity ]
    }
}

export function createMockSuccessfulPaymentMessage(total_amount: number, invoice_payload: string): Update.New & Update.NonChannel & Message.SuccessfulPaymentMessage {
    return {
        message_id: 1,
        chat,
        from: {...person},
        date: Date.now(),
        successful_payment: {
            currency: "EUR",
            total_amount,
            invoice_payload,
            telegram_payment_charge_id: "tg_0123456789",
            provider_payment_charge_id: "stripe_9876543210"
        }
    }
}

/* Mock bot's API calls */
jest.spyOn(Telegram.prototype, "callApi").mockResolvedValue(undefined);

const mock_telegram = new Telegram('');
export const mock_bot = new Telegraf('', { telegram: mock_telegram });

handlers.forEach(handler => handler(mock_bot));