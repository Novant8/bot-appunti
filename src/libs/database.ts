import { DynamoDBClient, QueryCommand, QueryCommandInput, ScanCommand, ScanCommandInput, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { resolve } from 'path';

export type NoteDetails = {
    materia: string,
    descrizione: string,
    prezzo: number,
    url_anteprima?: string,
    url_foto?: string
}

export type BundleDetails = {
    nome: string,
    descrizione: string,
    materie_prezzi: {
        [materia: string]: number
    },
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

export const getBundleNames = async () : Promise<string[]> => {
    const params : ScanCommandInput = {
        TableName: "appunti-bundle",
        ProjectionExpression: "nome"
    }

    const res = await db.send(new ScanCommand(params));

    return res.Items.map(i => i.nome.S);
}

export const getBundleDetails = async (name: string): Promise<BundleDetails> => {
    const params : QueryCommandInput = {
        TableName: "appunti-bundle",
        ProjectionExpression: "descrizione, materie_prezzi, url_foto",
        KeyConditionExpression: "nome = :name",
        ExpressionAttributeValues: {
            ":name": { S: name }
        }
    }

    const res = await db.send(new QueryCommand(params));

    return {
        nome: name,
        descrizione: res.Items[0].descrizione.S,
        materie_prezzi: Object.fromEntries(Object.entries(res.Items[0].materie_prezzi.M).map(([ materia, { N } ]) => [ materia, parseInt(N) ])),
        url_foto: res.Items[0].url_foto?.S
    };
}

export const getBundlePrice = async (name: string): Promise<number> => {
    const params : QueryCommandInput = {
        TableName: "appunti-bundle",
        ProjectionExpression: "materie_prezzi",
        KeyConditionExpression: "nome = :name",
        ExpressionAttributeValues: {
            ":name": { S: name }
        }
    }

    const res = await db.send(new QueryCommand(params));

    return Object.values(res.Items[0].materie_prezzi.M).reduce((tot, p) => tot + parseInt(p.N), 0)
}

export const getBundleFullNotesFileIDs = async (name: string): Promise<string[]> => {
    // GET COURSE NAMES CONTAINED IN BUNDLE
    const query_params : QueryCommandInput = {
        TableName: "appunti-bundle",
        ProjectionExpression: "materie_prezzi",
        KeyConditionExpression: "nome = :name",
        ExpressionAttributeValues: {
            ":name": { S: name }
        }
    }

    let res = await db.send(new QueryCommand(query_params));

    const courses = Object.keys(res.Items[0].materie_prezzi.M);

    return Promise.all(courses.map(c => getFullNotesFileId(c)));
}