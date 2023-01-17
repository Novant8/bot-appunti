import Stripe from 'stripe'
import { getBundleCourses } from './database';
const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: '2022-11-15'
});

export type UserNotes = {
    [userid: string]: string[]
}

/**
 * Fetches all users who have bought any notes after a given date from Stripe payments.
 * @param after Date after which payments should be fetched
 * @returns List of user ids that bought any notes after the given date
 */
export const getCustomersTelegramUserIDs = async (after: Date): Promise<string[]> => {
    const intents = await stripe.paymentIntents.list({
        created: { gte: after.getTime()/1000 },
        limit: 100
    });

    /* Filter failed payments and return unique TG user IDs */
    return intents.data.filter((pi, i) => pi.status === 'succeeded' && intents.data.findIndex(pi2 => pi2.metadata.tguser === pi.metadata.tguser) >= i)
                       .map(pi => pi.metadata.tguser);
};

/**
 * Fetches all users who have bought any notes after a given date from Stripe payments and maps each of them with a list of bought notes.
 * @param after Date after which payments should be fetched
 * @returns An object which maps each user with a list of notes bought after the given date
 */
export const groupBoughtNotesByUser = async (after: Date): Promise<UserNotes> => {
    const intents = await stripe.paymentIntents.list({
        created: { gte: after.getTime()/1000 },
        limit: 100
    });

    /* Build return object */
    const ret: UserNotes = {};
    for(const pi of intents.data.filter(pi => pi.status === 'succeeded')) {
        const payload = JSON.parse(pi.metadata.payload);
        let courses = payload.bundle ? await getBundleCourses(payload.bundle) : [ payload.course ];

        if(Array.isArray(ret[pi.metadata.tguser]))
            ret[pi.metadata.tguser].push(...courses);
        else
            ret[pi.metadata.tguser] = courses;
    }

    return ret;
}