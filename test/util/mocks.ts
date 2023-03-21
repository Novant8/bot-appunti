import { jest } from '@jest/globals';
import { Telegraf, Telegram } from "telegraf";
import { handlers } from '@event_handlers/index';
import type { Message, MessageEntity, Update } from 'telegraf/types'

export function createMockMessageUpdate<M extends Message>(message: Update.New & Update.NonChannel & M): Update.MessageUpdate<M> {
    return {
        update_id: 1,
        message
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
        chat: {
            id: 1,
            type: "private",
            first_name: "John Doe"
        },
        from: {
            id: 1,
            is_bot: false,
            first_name: "John Doe"
        },
        date: Date.now(),
        text,
        entities: [ commandEntity ]
    }
}

/* Mock bot's API calls */
jest.spyOn(Telegram.prototype, "callApi").mockResolvedValue(undefined);

const mock_telegram = new Telegram('');
export const mock_bot = new Telegraf('', { telegram: mock_telegram });

handlers.forEach(handler => handler(mock_bot));