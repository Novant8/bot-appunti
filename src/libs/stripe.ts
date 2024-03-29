import Stripe from 'stripe'
import { getBundleCoursesMap, getCustomerIDs, getPurchases, Purchase } from './database';
import type { InvoicePayload } from '@event_handlers/invoiceMessage';

const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: '2022-11-15'
});

export type UserNotes = {
    [userid: string]: string[]
}

/**
 * Fetches all users who have bought any notes after a given date from Stripe payments.
 * @param from Date after which payments should be fetched. If not specified, date will be epoch.
 * @param to Date before which payments should be fetched. If not specified, date will be now.
 * @returns List of user ids that bought any notes after the given date
 */
export const getCustomersTelegramUserIDs = async (from?: Date, to?: Date): Promise<number[]> => {
    const intents = await stripe.paymentIntents.list({
        created: { gte: from && Math.round(from.getTime()/1000), lte: to && Math.round(to.getTime()/1000) },
        limit: 100
    });

    /* Filter out failed payments and return distinct TG user IDs using a Set */
    const userids_set = new Set([
        ...intents.data.filter(pi => pi.status === 'succeeded')
                       .map(pi => parseInt(pi.metadata.tguser)),
        ...await getCustomerIDs(from, to)
    ])

    return Array.from(userids_set)
};

/**
 * Determines whether a Telegram user is a customer, i.e. has bought notes before.
 * @param userid ID of the Telegram user
 * @returns `true` if the user has bought notes before
 */
export const userIsCustomer = async (userid: number): Promise<boolean> => {
    const customers = await getCustomersTelegramUserIDs();
    return customers.includes(userid);
}

/**
 * Fetches all users who have bought any notes after a given date from Stripe payments and maps each of them with a list of bought notes.
 * @param from Date after which payments should be fetched. If not specified, date will be epoch.
 * @param to Date before which payments should be fetched. If not specified, date will be now.
 * @returns An object which maps each user with a list of notes bought after the given date
 */
export const groupBoughtNotesByUser = async (from?: Date, to?: Date): Promise<UserNotes> => {
    const intents = await stripe.paymentIntents.list({
        created: { gte: from && Math.round(from.getTime()/1000), lte: to && Math.round(to.getTime()/1000) },
        limit: 100
    });

    const bundleCourses = await getBundleCoursesMap();
    const purchases: Purchase[] = [
        ...await getPurchases(from, to),
        ...intents.data.filter(pi => pi.status === 'succeeded').map(pi => {
            const payload: InvoicePayload = JSON.parse(pi.metadata.payload);
            return {
                tguser: pi.metadata.tguser,
                courses: payload.bundle ? bundleCourses[payload.bundle] : [ payload.course ]
            }
        })
    ];

    /* Build return object: group courses by users */
    return purchases.reduce((ret, p) => {
        (ret[p.tguser] = ret[p.tguser] || []).push(...p.courses);
        return ret;
    }, {} as UserNotes);
}