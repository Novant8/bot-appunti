export {};

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            STAGE: "dev" | "prod",
            TELEGRAM_TOKEN: string,
            PAYMENT_TOKEN: string,
            CREATOR_USERID: string,
            CHANNEL_LINK: string,
            CHANNEL_ID: string
            STRIPE_API_KEY: string
            RECURRENT_MESSAGE_SECRET: string
        }
    }
}