import Stripe from 'stripe'
import { getBundleCoursesMap, getCustomerIDs, getPurchases, Purchase } from './database';
import { InvoicePayload } from '@event_handlers/invoiceMessage';

const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: '2022-11-15'
});

export type UserNotes = {
    [userid: string]: string[]
}

/**
 * Fetches all users who have bought any notes after a given date from Stripe payments.
 * @param after Date after which payments should be fetched. If not specified, all payments are fetched.
 * @returns List of user ids that bought any notes after the given date
 */
export const getCustomersTelegramUserIDs = async (after?: Date): Promise<string[]> => {
    const intents = await stripe.paymentIntents.list({
        created: after && { gte: Math.round(after.getTime()/1000) },
        limit: 100
    });

    /* Filter failed payments and return unique TG user IDs */
    return [
        ...intents.data.filter((pi, i) => pi.status === 'succeeded' && intents.data.findIndex(pi2 => pi2.metadata.tguser === pi.metadata.tguser) >= i)
                       .map(pi => pi.metadata.tguser),
        ...(await getCustomerIDs(after)).filter(id => !intents.data.find(pi => pi.status === 'succeeded' && pi.metadata.tguser === id))
    ];
};

/**
 * Determines whether a Telegram user is a customer, i.e. has bought notes before.
 * @param userid ID of the Telegram user
 * @returns `true` if the user has bought notes before
 */
export const userIsCustomer = async (userid: string): Promise<boolean> => {
    const customers = await getCustomersTelegramUserIDs();
    return customers.includes(userid);
}

/**
 * Fetches all users who have bought any notes after a given date from Stripe payments and maps each of them with a list of bought notes.
 * @param after Date after which payments should be fetched. If not specified, all payments are fetched.
 * @returns An object which maps each user with a list of notes bought after the given date
 */
export const groupBoughtNotesByUser = async (after?: Date): Promise<UserNotes> => {
    const intents = await stripe.paymentIntents.list({
        created: after && { gte: Math.round(after.getTime()/1000) },
        limit: 100
    });

    const bundleCourses = await getBundleCoursesMap();
    const purchases: Purchase[] = [
        ...await getPurchases(after),
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