import { DynamoDBClient, QueryCommand, QueryCommandInput, ScanCommand, ScanCommandInput, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';

export type NoteDetails = {
    materia: string,
    professori: string[],
    anno: number,
    contenuto: string,
    tecnologia: string,
    pagine: number,
    "note aggiuntive"?: string,
    prezzo: number
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
        ProjectionExpression: "materia, professori, anno, contenuto, tecnologia, pagine, #note, prezzo",
        KeyConditionExpression: "materia = :course",
        ExpressionAttributeValues: {
            ":course": { S: course }
        },
        ExpressionAttributeNames: {
            "#note": "note aggiuntive"
        }
    }

    const res = await db.send(new QueryCommand(params));

    return {
        materia: res.Items[0].materia.S,
        professori: res.Items[0].professori.SS,
        anno: parseInt(res.Items[0].anno.N),
        contenuto: res.Items[0].contenuto.S,
        tecnologia: res.Items[0].tecnologia.S,
        "note aggiuntive": res.Items[0]["note aggiuntive"].S ?? undefined,
        pagine: parseInt(res.Items[0].pagine.N),
        prezzo: parseFloat(res.Items[0].prezzo.N)
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