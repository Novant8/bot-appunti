import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import { getCourseNames, updateNotesFile } from '@libs/database';
import { createMockDocumentMessage, createMockMessageUpdate, mock_bot } from './util/mocks';

jest.mock("@libs/stripe");
jest.mock("@libs/database");

describe("Update file", () => {
    const mock_getCourseNames = getCourseNames as jest.Mock<typeof getCourseNames>;
    const mock_updateNotesFile = updateNotesFile as jest.Mock<typeof updateNotesFile>;
    
    const course_names = [ "Analisi 1", "Chimica", "Fisica 1" ];

    beforeAll(() => {
        mock_getCourseNames
            .mockReset()
            .mockResolvedValue(course_names);
        mock_updateNotesFile
            .mockReset()
            .mockResolvedValue(undefined);
    })

    it("should update file", async () => {
        const message = createMockDocumentMessage(`appunti_${course_names[0]}.pdf`, course_names[0]);
        message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_updateNotesFile).toHaveBeenCalled();
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                chat_id: message.chat.id,
                text: `Aggiornato documento di ${course_names[0]}`
            })
        );
    })

    it("should not update from normal user", async () => {
        const message = createMockDocumentMessage("appunti_Analisi1.pdf", "Analisi 1");
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_updateNotesFile).not.toHaveBeenCalled();
    })

    it("should not update non-existant course", async () => {
        const invalid_course = "Invalid course";
        const message = createMockDocumentMessage(`appunti_${invalid_course}.pdf`, invalid_course);
        message.from.id = message.chat.id = parseInt(process.env.CREATOR_USERID);
        const update = createMockMessageUpdate(message);

        await mock_bot.handleUpdate(update);

        expect(mock_updateNotesFile).not.toHaveBeenCalled();
        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                chat_id: message.chat.id,
                text: expect.stringContaining(`Corso \`${invalid_course}\` invalido`)
            })
        );
    })
})