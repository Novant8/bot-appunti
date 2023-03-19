import type { AWS } from '@serverless/typescript';

import telegram from '@functions/telegram';
/* import recurrent_message from '@functions/recurrent-message'; // Disabled feature */

const serverlessConfiguration: AWS = {
  service: 'bot-appunti',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-dotenv-plugin'],
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
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000'
    },
  },
  // import the function via paths
  functions: { telegram/*, recurrent_message*/ },
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
  useDotenv: true
};

module.exports = serverlessConfiguration;
