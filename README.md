# Bot Appunti (Notes Bot)

### **A serverless Telegram bot for selling university notes.**

This bot is based on:
* [Telegraf](https://github.com/telegraf/telegraf) as the bot's main framework.
* [Stripe](https://stripe.com/) for handling payments.
* [AWS DynamoDB](https://aws.amazon.com/it/dynamodb/) for storing notes' information.
* [AWS Lambda](https://aws.amazon.com/it/lambda/) for handling events sent by Telegram through webhooks.

**A working example can be found in [this Telegram channel](https://t.me/appuntiTriennaleIngInf) and at [this user](https://t.me/VernaAppuntiBot).**

Most strings and attributes are written in Italian 🇮🇹.

## Features

* **Process payments** directly from Telegram using their [Payments 2.0](https://core.telegram.org/bots/payments) API and Stripe. When a payment is successful, the user immediately receives the notes' file as a private message.
* **Upload and update notes' files**, which are stored in Telegram's servers.
* **Send announcements** to every user who has already bought notes of certain (or all) courses. Useful to notify updates to your notes.
* **Send user satisfaction polls** to quantify how users liked your notes.
* **Automatic forwarding** to the bot's creator of all private messages sent by any user.
* **Separate behaviour for dev and production stages**.

## Commands

The following commands can **only be executed by the creator of the bot**:
| Command | Description |
| --- | --- |
| `/addpurchase <tg_userid> <course>` | Manually adds a purchase to your DynamoDB database. This may be the case when the customer uses a payment method which can't be saved automatically by Stripe. |
| `/announce <course> <date> <message>` | Announces a message to users who have bought notes of a given course after `date`. `course` may also be `All` to send the announcement to every customer. `date` may be specified in any format supported by Javascript's `Date` object. To include the user's first name inside the `message`, use the variable `%name%`. |
| `/askfeedback <from> <to>` | Sends a satisfaction poll to all users who have bought notes of any course between `from` and `to` timestamps/dates. The poll is also sent to the creator, so they can view the results.  |
| `/deletemessage <url>` | Deletes a message given its URL. The bot must have permissions to delete the message. |

To **update a file**, the creator can privately send a document to the bot with the name of the course as the caption.


The bot also supports [**inline mode**](https://core.telegram.org/bots/inline) to send **invoice messages** related to notes and bundles. This can be done by any user.

## Environment variables

Environment variables' values change depending on the current stage and are stored in the following files:
* `.env.prod` for production stage
* `.env.dev` for development stage
* `.env.test` is used by the testing library. Should contain dummy values.

These files must contain the following environment variables:
| Variable | Notes |
| --- | --- |
| `STAGE` | Can be `dev`, `prod` or `test`. The bot behaves differently depending on the current working stage. |
| `TELEGRAM_TOKEN` | Sent to you by BotFather after creating the new bot. |
| `PAYMENT_TOKEN` | Sent to you by BotFather after linking Stripe to your bot. |
| `CREATOR_USERID` | |
| `SHOP_CHANNEL` | Name or ID of the channel that you intend to use as showcase for your notes. [This channel](https://t.me/appuntiTriennaleIngInf) can serve as an example. |
| `SHOP_CHANNEL_LINK` | |
| `STRIPE_API_KEY`| Obtained from your Stripe dashboard. |

## Database

This project uses a DynamoDB database to store notes' and additional purchases' information. The following tables need to be created:
* `appunti` (Notes):
    | Attribute | Type | Description |
    | --- | --- | --- |
    | `materia` (course) | String (*partition key*) | Name of the course the notes belong to. |
    | `descrizione` (description) | String | Brief description of the notes. |
    | `prezzo` (price) | Number | Price of the notes specified as the number of cents (must be an integer). |
    | `fileId_full` | String | ID of the notes' file stores in Telegram's servers. |
    | `fileId_full_DEV` | String | Same as `fileId_full`, but this attribute is used only in development stage. |
    | `url_anteprima` (url_preview) | String | URL of the message containing a preview of the notes (provided by Telegram). |
    | `ordine` (order) | Number | Specifies in which order the notes should be listed. |
    | `url_foto` (url_image) | String | URL containing the image to be displayed inside the invoice messsage. |

* `appunti-bundle` (note-bundles):
    | Attribute | Type | Description |
    | --- | --- | --- |
    | `nome` (name) | String (*partition key*) | Name of the bundle. |
    | `descrizione` (description) | String | Brief description of the bundle |
    | `materie_prezzi` (course_prices) | Map<String, Number> | Object that maps each course contained in the bundle and its contribute to the total price: `{ course: price }`. `course` refers to the name of the course, as specified in the `appunti` (notes) table. |
    | `ordine` (order) | Number | Specifies in which order the bundles should be listed. (Should be relative to only bundles, bundles are *always* displayed after notes.) |
    | `url_foto` (url_image) | String | URL containing the image to be displayed inside the invoice messsage. |


* `acquisti-appunti` (notes-purchases):
    | Attribute | Type | Description |
    | --- | --- | --- |
    | `materia` (course) | String (*partition key*) | Name of the course, as specified in the `appunti` (notes) table. |
    | `timestamp` | Number (*sort key*) | Time of purchase. |
    | `tguser` | Number | Telegram ID of the customer. |

## Setup

1. Setup and populate the database as specified [here](#database).

2. [Create a new Telegram bot](https://core.telegram.org/bots/tutorial).

2. Create the files `.env.dev` and `.env.prod` inside the root folder and setup the environment variables as specified [here](#environment-variables).

3. Deploy the project to AWS:
    ```
    serverless deploy -s <stage>
    ```

4. Setup a webhook on Telegram's end with the following URL:
    ```
    https://api.telegram.org/bot<token>/setWebhook?url=<api_endpoint>
    ```
    The API endpoint is provided by the output of the `serverless` command executed previously.