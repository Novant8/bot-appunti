import { Dropbox } from 'dropbox';

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_TOKEN })

export const getFullNotesLink = async (course : string) : Promise<string> => {
    const res = await dbx.filesGetTemporaryLink({ path: `/${course}/${course}-full.pdf` });
    return res.result.link;
}