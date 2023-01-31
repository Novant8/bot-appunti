export {};

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            STAGE: "dev" | "prod",
            TELEGRAM_TOKEN: string,
            PAYMENT_TOKEN: string,
            CREATOR_USERID: string,
            SHOP_CHANNEL: string,
            SHOP_CHANNEL_LINK: string,
            ADVERT_CHANNEL: string,
            STRIPE_API_KEY: string,
            RECURRENT_MESSAGE_SECRET: string
        }
    }
}