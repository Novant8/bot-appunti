import { describe, it, expect, jest, beforeAll } from '@jest/globals'
import { addPurchase, getCourseNames } from '@libs/database';
import { createMockMessageUpdate, createMockTextMessage, mock_bot } from './util/mocks';

describe("Add purchase command", () => {
    const mock_getCourseNames = getCourseNames as jest.Mock<typeof getCourseNames>;
    const mock_addPurchase = addPurchase as jest.Mock<typeof addPurchase>;

    const course_names = [ "Analisi 1", "Chimica", "Fisica 1" ];
    
    beforeAll(() => {
        mock_getCourseNames
            .mockReset()
            .mockResolvedValue(course_names);
        mock_addPurchase
            .mockReset()
            .mockResolvedValue(undefined);
    })

    it("should add purchase of single course", async () => {
        const user_id = 1234567890;
        const course = "Analisi 1";
        
        const message = createMockTextMessage(`/addpurchase ${user_id} ${course.replace(/\s+/g, '_')}`);
        message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_addPurchase).toHaveBeenCalledWith(user_id, [ course ]);
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'sendMessage',
            {
                chat_id: message.chat.id,
                text: "Purchase added!"
            }
        )
    })

    it("should add purchase of multiple courses", async () => {
        const user_id = 1234567890;
        const courses = [ "Analisi 1", "Chimica" ];
        
        const message = createMockTextMessage(`/addpurchase ${user_id} ${courses.map(c => c.replace(/\s+/g, '_')).join(' ')}`);
        message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_addPurchase).toHaveBeenCalledWith(user_id, courses);
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'sendMessage',
            {
                chat_id: message.chat.id,
                text: "Purchase added!"
            }
        )
    })

    describe("Invalid inputs", () => {
        it("no arguments", async () => {            
            const message = createMockTextMessage(`/addpurchase`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_addPurchase).not.toHaveBeenCalled();
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: "Invalid user provided."
                }
            )
        })

        it("user as generic string", async () => {
            const user_id = "not_a_user";
            
            const message = createMockTextMessage(`/addpurchase ${user_id}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_addPurchase).not.toHaveBeenCalled();
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: "Invalid user provided."
                }
            )
        })

        it("only user provided", async () => {
            const user_id = 1234567890;
            
            const message = createMockTextMessage(`/addpurchase ${user_id}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_addPurchase).not.toHaveBeenCalled();
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: "No courses provided."
                }
            )
        })

        it("non-existant course", async () => {
            const user_id = 1234567890;
            const course = "Not a course";
            
            const message = createMockTextMessage(`/addpurchase ${user_id} ${course.replace(/\s+/g, '_')}`);
            message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
            const update = createMockMessageUpdate(message);
    
            await mock_bot.handleUpdate(update);
    
            expect(mock_addPurchase).not.toHaveBeenCalled();
            expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
                'sendMessage',
                {
                    chat_id: message.chat.id,
                    text: "One or more courses specified are invalid."
                }
            )
        })
    })
})