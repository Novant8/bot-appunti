import { DynamoDBClient, ScanCommand, ScanCommandInput } from '@aws-sdk/client-dynamodb';

const db = new DynamoDBClient({
    region: "eu-south-1",
})

export const getCourseNames = async () : Promise<string[]> => {
    const params : ScanCommandInput = {
        TableName: "appunti",
        ProjectionExpression: "materia"
    }

    const res = await db.send(new ScanCommand(params));

    return res.Items.map(i => i.materia.S);
}