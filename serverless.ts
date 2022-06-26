import type { AWS } from '@serverless/typescript';
import 'dotenv/config';

import telegram from '@functions/telegram';

const serverlessConfiguration: AWS = {
  service: 'bot-appunti',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    region: 'eu-south-1',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
      PAYMENT_TOKEN: process.env.PAYMENT_TOKEN,
      CREATOR_USERID: process.env.CREATOR_USERID,
      CHANNEL_LINK: process.env.CHANNEL_LINK
    },
  },
  // import the function via paths
  functions: { telegram },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
};

module.exports = serverlessConfiguration;
