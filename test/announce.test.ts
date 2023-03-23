import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { getFullNotesFileId } from '@libs/database';
import { getCustomersTelegramUserIDs, groupBoughtNotesByUser } from '@libs/stripe';
import { TelegramError } from 'telegraf';
import { Chat } from 'telegraf/types';
import wait from 'wait';
import { createMockMessageUpdate, createMockTextMessage, mock_bot } from './util/mocks';

describe("Announcements", () => {
    const mock_getCustomersTelegramUserIDs = getCustomersTelegramUserIDs as jest.Mock<typeof getCustomersTelegramUserIDs>;
    const mock_groupBoughtNotesByUser = groupBoughtNotesByUser as jest.Mock<typeof groupBoughtNotesByUser>;
    const mock_getFullNotesFileId = getFullNotesFileId as jest.Mock<typeof getFullNotesFileId>;
    const mock_tg_callApi = mock_bot.telegram.callApi as jest.Mock;
    const mock_wait = wait as jest.Mock<typeof wait>

    const customerids = [ "12345", "67890" ];
    const userids = [ ...customerids, process.env.CREATOR_USERID ];
    const groupedNotes = {
        "12345": [ "Analisi 1", "Chimica" ],
        "67890": [ "Fisica 1" ]
    }
    const course_customers = [ "12345" ];
    const user_info: { [id: string]: Chat.PrivateGetChat } = {
        "12345": {
            id: 12345,
            type: "private",
            first_name: "Mario"
        },
        "67890": {
            id: 67890,
            type: "private",
            first_name: "Luigi"
        },
        [process.env.CREATOR_USERID]: {
            id: parseInt(process.env.CREATOR_USERID),
            type: "private",
            first_name: "Creator"
        }
    }
    const course_files: { [course: string]: string } ={
        "Analisi 1": '4n4l151_1',
        "Chimica": 'ch1m1c4',
        "Fisica 1": 'f151c4_1'
    }

    async function mock_callApi_impl(operation: string, data: any) {
        switch (operation) {
            case 'getChat':
                return user_info[data.chat_id];
            case 'sendMessage':
            case 'sendPoll':
            case 'forwardMessage':
            case 'sendDocument':
                return { message_id: 1 }
            default:
                return undefined;
        }
    }

    beforeAll(() => {
        mock_groupBoughtNotesByUser
            .mockReset()
            .mockResolvedValue(groupedNotes);
        mock_getFullNotesFileId
            .mockReset()
            .mockImplementation(async course => course_files[course]);
        mock_wait
            .mockReset()
            .mockResolvedValue(undefined);
    })

    beforeEach(() => {
        mock_tg_callApi
            .mockReset()
            .mockImplementation(mock_callApi_impl);
        mock_getCustomersTelegramUserIDs
            .mockReset()
            .mockResolvedValue([ ...customerids ]);
    })

    describe("Announce command", () => {
        it("should announce to all customers after date and creator", async () => {
            const course = "All";
            const date = "2023-03-01";
            const text = "This is an announcement";

            const message = createMockTextMessage(`/announce ${course.replace(/\s+/g, '_')} ${date} ${text}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);

            await mock_bot.handleUpdate(update);

            expect(mock_getCustomersTelegramUserIDs).toHaveBeenCalledWith(new Date(date));
            userids.forEach(userid => {
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    expect.objectContaining({
                        chat_id: userid,
                        text
                    })
                )
            })
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: `Sent message to the following users:\n${userids.join('\n')}`
                }
            )
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: expect.stringContaining("Could not send message")
                }
            )
        })

        it("should announce document to customers of single course and creator", async () => {
            const course = "Analisi 1";
            const date = "2023-03-01";
            const text = "This is an announcement";

            const message = createMockTextMessage(`/announce ${course.replace(/\s+/g, '_')} ${date} ${text}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);

            await mock_bot.handleUpdate(update);

            [ ...course_customers, process.env.CREATOR_USERID ].forEach(userid => {
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendDocument',
                    expect.objectContaining({
                        chat_id: userid,
                        caption: text,
                        document: course_files[course]
                    })
                )
            })
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: `Sent message to the following users:\n${[...course_customers, process.env.CREATOR_USERID].join('\n')}`
                }
            )
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: expect.stringContaining("Could not send message")
                }
            )
        })

        it("should include first name in announcement", async () => {
            const course = "All";
            const date = "2023-03-01";
            const text = "Hello %name%";

            const message = createMockTextMessage(`/announce ${course.replace(/\s+/g, '_')} ${date} ${text}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);

            await mock_bot.handleUpdate(update);

            userids.forEach(userid => {
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    expect.objectContaining({
                        chat_id: userid,
                        text: `Hello ${user_info[userid].first_name}`
                    })
                )
            })
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: `Sent message to the following users:\n${userids.join('\n')}`
                }
            )
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: expect.stringContaining("Could not send message")
                }
            )
        })

        it("should wait and re-send message after Telegram gives 429 error", async () => {
            const retry_after = 30;
            mock_tg_callApi.mockImplementationOnce(function throw429(op: string, data: any) {
                // Throw error only on first call with "sendMessage" operation
                if(op === 'sendMessage')
                    throw new TelegramError({
                        error_code: 429,
                        description: "Too many requests!",
                        parameters: { retry_after }
                    })
                mock_tg_callApi.mockImplementationOnce(throw429);
                return mock_callApi_impl(op, data);
            })

            const course = "All";
            const date = "2023-03-01";
            const text = "This is an announcement";

            const message = createMockTextMessage(`/announce ${course.replace(/\s+/g, '_')} ${date} ${text}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);

            await mock_bot.handleUpdate(update);

            expect(mock_wait).toHaveBeenCalledWith(retry_after*1000);
            userids.forEach(userid => {
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    expect.objectContaining({
                        chat_id: userid,
                        text
                    })
                )
            })
            /* First user should have 2 tries */
            expect(mock_tg_callApi.mock.calls.filter(c => c[0] === 'sendMessage' && (c[1] as any).chat_id == userids[0])).toHaveLength(2)
            
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: `Sent message to the following users:\n${userids.join('\n')}`
                }
            )
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: expect.stringContaining("Could not send message")
                }
            )
        })

        it("should notify when a critical error occurs on a user", async () => {
            mock_tg_callApi.mockImplementationOnce(function throw429(op: string, data: any) {
                // Throw error only on first call with "sendMessage" operation
                if(op === 'sendMessage')
                    throw new TelegramError({
                        error_code: 500,
                        description: "Something bad happened"
                    })
                mock_tg_callApi.mockImplementationOnce(throw429);
                return mock_callApi_impl(op, data);
            })

            const course = "All";
            const date = "2023-03-01";
            const text = "This is an announcement";

            const message = createMockTextMessage(`/announce ${course.replace(/\s+/g, '_')} ${date} ${text}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);

            await mock_bot.handleUpdate(update);

            userids.forEach(userid => {
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    expect.objectContaining({
                        chat_id: userid,
                        text
                    })
                )
            })
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: `Sent message to the following users:\n${userids.slice(1).join('\n')}`
                }
            )
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: `Could not send message to the following users:\n${userids[0]}`
                }
            )
        })

        describe("Invalid arguments", () => {
            it("no arguments given", async () => {
                const message = createMockTextMessage(`/announce`);
                message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
                const update = createMockMessageUpdate(message);
    
                await mock_bot.handleUpdate(update);
    
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: message.chat.id,
                        text: "No course given"
                    }
                )
            })

            it("only course given", async () => {
                const course = "All";

                const message = createMockTextMessage(`/announce ${course}`);
                message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
                const update = createMockMessageUpdate(message);
    
                await mock_bot.handleUpdate(update);
    
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: message.chat.id,
                        text: "Invalid date provided"
                    }
                )
            })

            it("no message given", async () => {
                const course = "All";
                const date = "2023-03-01";

                const message = createMockTextMessage(`/announce ${course} ${date}`);
                message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
                const update = createMockMessageUpdate(message);
    
                await mock_bot.handleUpdate(update);
    
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: message.chat.id,
                        text: "No message given"
                    }
                )
            })

            it("non-existant course given", async () => {
                const course = "I do not exist";
                const date = "2023-03-01";
                const text = "This is an announcement";

                const message = createMockTextMessage(`/announce ${course.replace(/\s+/g, '_')} ${date} ${text}`);
                message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
                const update = createMockMessageUpdate(message);
    
                await mock_bot.handleUpdate(update);
    
                expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: expect.any(String),
                        text
                    }
                )
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: message.chat.id,
                        text: "No recipients were found for this announcement."
                    }
                )
            })

            it("invalid date given", async () => {
                const course = "Analisi 1";
                const date = "notadate";
                const text = "This is an announcement";

                const message = createMockTextMessage(`/announce ${course.replace(/\s+/g, '_')} ${date} ${text}`);
                message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
                const update = createMockMessageUpdate(message);
    
                await mock_bot.handleUpdate(update);
    
                expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: expect.any(String),
                        text
                    }
                )
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: message.chat.id,
                        text: "Invalid date provided"
                    }
                )
            })
        })
    })

    describe("Ask feedback command", () => {

        it("should send message and poll to all customers after date and creator", async () => {
            const from = "2023-03-01";

            const message = createMockTextMessage(`/askfeedback ${from}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);

            await mock_bot.handleUpdate(update);

            expect(mock_groupBoughtNotesByUser).toHaveBeenCalledWith(new Date(from), undefined);
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendPoll',
                expect.objectContaining({
                    chat_id: parseInt(process.env.CREATOR_USERID),
                    question: expect.stringContaining("soddisfatto"),
                    options: expect.any(Array<String>)
                })
            )
            customerids.forEach(userid => {
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'forwardMessage',
                    {
                        from_chat_id: message.chat.id,
                        chat_id: userid,
                        message_id: 1
                    }
                )
            })
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: `Sent message to the following users:\n${customerids.join('\n')}`
                }
            )
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: expect.stringContaining("Could not send message")
                }
            )
        })

        it("should consider date interval", async () => {
            const from = "2023-03-01";
            const to = "2023-08-01"

            const message = createMockTextMessage(`/askfeedback ${from} ${to}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);

            await mock_bot.handleUpdate(update);

            expect(mock_groupBoughtNotesByUser).toHaveBeenCalledWith(new Date(from), new Date(to));
        })

        it("should wait and re-send poll after Telegram gives 429 error", async () => {
            const retry_after = 30;
            mock_tg_callApi.mockImplementationOnce(function throw429(op: string, data: any) {
                // Throw error only on first call with "sendMessage" operation
                if(op === 'forwardMessage')
                    throw new TelegramError({
                        error_code: 429,
                        description: "Too many requests!",
                        parameters: { retry_after }
                    })
                mock_tg_callApi.mockImplementationOnce(throw429);
                return mock_callApi_impl(op, data);
            })

            const from = "2023-03-01";

            const message = createMockTextMessage(`/askfeedback ${from}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);

            await mock_bot.handleUpdate(update);

            expect(mock_wait).toHaveBeenCalledWith(retry_after*1000);
            customerids.forEach(userid => {
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'forwardMessage',
                    {
                        from_chat_id: message.chat.id,
                        chat_id: userid,
                        message_id: 1
                    }
                )
            })
            expect(mock_tg_callApi.mock.calls.filter(c => c[0] === 'forwardMessage' && (c[1] as any).chat_id == userids[0])).toHaveLength(2)
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: `Sent message to the following users:\n${customerids.join('\n')}`
                }
            )
            expect(mock_bot.telegram.callApi).not.toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: expect.stringContaining("Could not send message")
                }
            )
        })

        describe("Invalid arguments", () => {
            it("no arguments given", async () => {
                const message = createMockTextMessage(`/askfeedback`);
                message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
                const update = createMockMessageUpdate(message);
    
                await mock_bot.handleUpdate(update);
    
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: message.chat.id,
                        text: "Invalid date(s) provided"
                    }
                )
            })

            it("invalid 'from' date given", async () => {
                const from = "not_a_date";
                const to = "2023-08-01";

                const message = createMockTextMessage(`/askfeedback ${from} ${to}`);
                message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
                const update = createMockMessageUpdate(message);
    
                await mock_bot.handleUpdate(update);
    
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: message.chat.id,
                        text: "Invalid date(s) provided"
                    }
                )
            })

            it("invalid 'to' date given", async () => {
                const from = "2023-03-01"
                const to = "not_a_date";

                const message = createMockTextMessage(`/askfeedback ${from} ${to}`);
                message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
                const update = createMockMessageUpdate(message);
    
                await mock_bot.handleUpdate(update);
    
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: message.chat.id,
                        text: "Invalid date(s) provided"
                    }
                )
            })

            it("invalid interval (from > to)", async () => {
                const from = "2023-08-01";
                const to = "2023-03-01";

                const message = createMockTextMessage(`/askfeedback ${from} ${to}`);
                message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
                const update = createMockMessageUpdate(message);
    
                await mock_bot.handleUpdate(update);
    
                expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                    'sendMessage',
                    {
                        chat_id: message.chat.id,
                        text: "Invalid date interval"
                    }
                )
            })
        })
    })

})