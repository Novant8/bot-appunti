import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from "aws-lambda"

export type BasicHandler = Handler<APIGatewayProxyEvent, APIGatewayProxyResult>;

export const errorResponse = (error : Error) : APIGatewayProxyResult => {
  return {
    statusCode: 500,
    body: error.message
  }
}

export const okResponse : APIGatewayProxyResult = {
  statusCode: 200,
  body: ''
}