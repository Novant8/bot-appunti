import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from "aws-lambda"

type APIResponse = string | object;
export type BasicHandler = Handler<APIGatewayProxyEvent, APIGatewayProxyResult>;

export const formatJSONResponse = (response: APIResponse = '') => {
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  }
}

export const okResponse = formatJSONResponse();