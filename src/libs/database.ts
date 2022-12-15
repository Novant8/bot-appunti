import { DynamoDBClient, QueryCommand, QueryCommandInput, ScanCommand, ScanCommandInput, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';

export type NoteDetails = {
    materia: string,
    descrizione: string,
    prezzo: number,
    url_anteprima?: string,
    url_foto?: string
}

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

export const getNoteDetails = async (course : string) : Promise<NoteDetails> => {
    const params : QueryCommandInput = {
        TableName: "appunti",
        ProjectionExpression: "descrizione, prezzo, url_foto, url_anteprima",
        KeyConditionExpression: "materia = :course",
        ExpressionAttributeValues: {
            ":course": { S: course }
        }
    }

    const res = await db.send(new QueryCommand(params));

    return {
        materia: course,
        descrizione: res.Items[0].descrizione.S,
        prezzo: parseInt(res.Items[0].prezzo.N),
        url_anteprima: res.Items[0].url_anteprima?.S,
        url_foto: res.Items[0].url_foto?.S
    }
}

export const getFullNotesFileId = async (course : string) : Promise<string> => {
    const params : QueryCommandInput = {
        TableName: "appunti",
        ProjectionExpression: "fileId_full",
        KeyConditionExpression: "materia = :course",
        ExpressionAttributeValues: {
            ":course": { S: course }
        }
    }

    const res = await db.send(new QueryCommand(params));

    return res.Items[0].fileId_full.S;
}

export const updateNotesFile = async (course : string, file_id : string) : Promise<void> => {
    const params : UpdateItemCommandInput = {
        TableName: "appunti",
        Key: {
            materia: { S: course }
        },
        UpdateExpression: "SET fileId_full = :fileid",
        ExpressionAttributeValues: {
            ":fileid": { S: file_id }
        }
    }

    await db.send(new UpdateItemCommand(params));
}