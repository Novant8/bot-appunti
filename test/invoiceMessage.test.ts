import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import type { NoteDetails, BundleDetails } from '@libs/database';
import { getBundleDetails, getBundleNames, getCourseNames, getNoteDetails } from '@libs/database';
import { createMockInlineQueryUpdate, mock_bot } from './util/mocks';

describe("Invoice message", () => {
    const mock_getCourseNames = getCourseNames as jest.Mock<typeof getCourseNames>;
    const mock_getBundleNames = getBundleNames as jest.Mock<typeof getBundleNames>;
    const mock_getNoteDetails = getNoteDetails as jest.Mock<typeof getNoteDetails>;
    const mock_getBundleDetails = getBundleDetails as jest.Mock<typeof getBundleDetails>;
    
    const course_names = [ "Analisi 1", "Chimica", "Analisi 2" ];
    const bundle_names = [ "Primo anno" ];

    const note_details: { [course: string]: NoteDetails } = {
        "Analisi 1": {
            materia: "Analisi 1",
            descrizione: "Appunti completi Analisi 1",
            prezzo: 1000
        },
        "Chimica": {
            materia: "Chimica",
            descrizione: "Appunti completi Chimica",
            prezzo: 1000
        },
        "Analisi 2": {
            materia: "Analisi 2",
            descrizione: "Appunti completi Analisi 2",
            prezzo: 1000
        }
    }

    const bundle_details: { [bundle: string]: BundleDetails } = {
        "Primo anno": {
            nome: "Primo anno",
            descrizione: "Contiene tutti gli appunti del primo anno",
            materie_prezzi: {
                "Analisi 1": 950,
                "Chimica": 900
            }
        }
    }

    beforeAll(() => {
        mock_getCourseNames
            .mockReset()
            .mockResolvedValue(course_names);
        mock_getBundleNames
            .mockReset()
            .mockResolvedValue(bundle_names);
        mock_getNoteDetails
            .mockReset()
            .mockImplementation(async bundle => note_details[bundle]);
        mock_getBundleDetails
            .mockReset()
            .mockImplementation(async bundle => bundle_details[bundle]);
    })

    it("should return invoice info of all messages", async () => {
        const update = createMockInlineQueryUpdate("");

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'answerInlineQuery',
            {
                inline_query_id: update.inline_query.id,
                results: [
                    ...course_names.map(course => expect.objectContaining({
                        id: course,
                        input_message_content: expect.objectContaining({
                            payload: JSON.stringify({ course }),
                            prices: [
                                {
                                    label: `Appunti ${course}`,
                                    amount: note_details[course].prezzo
                                }
                            ]
                        })
                    })),
                    ...bundle_names.map(bundle => expect.objectContaining({
                        id: `bundle-${bundle}`,
                        input_message_content: expect.objectContaining({
                            payload: JSON.stringify({ bundle }),
                            prices: Object.entries(bundle_details[bundle].materie_prezzi).map(([ course, amount ]) => ({
                                label: `Appunti ${course}`,
                                amount
                            }))
                        })
                    }))
                ]
            }
        )
    })

    it("should search single course", async () => {
        const update = createMockInlineQueryUpdate("chim");

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'answerInlineQuery',
            {
                inline_query_id: update.inline_query.id,
                results: [
                    expect.objectContaining({
                        id: "Chimica"
                    })
                ]
            }
        )
    })

    it("should search bundle", async () => {
        const update = createMockInlineQueryUpdate("primo");

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'answerInlineQuery',
            {
                inline_query_id: update.inline_query.id,
                results: [
                    expect.objectContaining({
                        id: "bundle-Primo anno"
                    })
                ]
            }
        )
    })

    it("should return no results", async () => {
        const update = createMockInlineQueryUpdate("non-existant");

        await mock_bot.handleUpdate(update);

        expect(mock_bot.telegram.callApi).toHaveBeenCalledWith(
            'answerInlineQuery',
            {
                inline_query_id: update.inline_query.id,
                results: [ ]
            }
        )
    })
})