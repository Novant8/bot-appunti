import { DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput, ScanCommand, ScanCommandInput, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';

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

export type GetCourseNamesOptions = {
    sorted: boolean
}

export type getBundleNamesOptions = {
    sorted: boolean
}

export type BundleCourses = {
    [bundle: string]: string[]
}

export type Purchase = {
    tguser: string,
    courses: string[]
}

const db = new DynamoDBClient({
    region: "eu-south-1",
})

export const getCourseNames = async (options: GetCourseNamesOptions = { sorted: false }) : Promise<string[]> => {    
    const params : ScanCommandInput = {
        TableName: "appunti",
        ProjectionExpression: "materia, ordine"
    }

    const res = await db.send(new ScanCommand(params));
    const items = options.sorted ? res.Items.sort((i1, i2) => parseInt(i1.ordine.N) - parseInt(i2.ordine.N)) : res.Items;

    return items.map(i => i.materia.S);
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
    const fileId_full = process.env.STAGE === 'prod' ? 'fileId_full' : 'fileId_full_DEV';
    const params : QueryCommandInput = {
        TableName: "appunti",
        ProjectionExpression: fileId_full,
        KeyConditionExpression: "materia = :course",
        ExpressionAttributeValues: {
            ":course": { S: course }
        }
    }

    const res = await db.send(new QueryCommand(params));

    return res.Items[0][fileId_full].S;
}

export const updateNotesFile = async (course : string, file_id : string) : Promise<void> => {
    const fileId_full = process.env.STAGE === 'prod' ? 'fileId_full' : 'fileId_full_DEV';
    const params : UpdateItemCommandInput = {
        TableName: "appunti",
        Key: {
            materia: { S: course }
        },
        UpdateExpression: `SET ${fileId_full} = :fileid`,
        ExpressionAttributeValues: {
            ":fileid": { S: file_id }
        }
    }

    await db.send(new UpdateItemCommand(params));
}

export const getBundleNames = async (options: getBundleNamesOptions = { sorted: false }) : Promise<string[]> => {
    const params : ScanCommandInput = {
        TableName: "appunti-bundle",
        ProjectionExpression: "nome, ordine"
    }

    const res = await db.send(new ScanCommand(params));
    const items = options.sorted ? res.Items.sort((i1, i2) => parseInt(i1.ordine.N) - parseInt(i2.ordine.N)) : res.Items;

    return items.map(i => i.nome.S);
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

export const getBundleCourses = async (name: string): Promise<string[]> => {
    const params : QueryCommandInput = {
        TableName: "appunti-bundle",
        ProjectionExpression: "materie_prezzi",
        KeyConditionExpression: "nome = :name",
        ExpressionAttributeValues: {
            ":name": { S: name }
        }
    }

    const res = await db.send(new QueryCommand(params));

    return Object.keys(res.Items[0].materie_prezzi.M);
}

export const getBundleCoursesMap = async (): Promise<BundleCourses> => {
    const params : ScanCommandInput = {
        TableName: "appunti-bundle",
        ProjectionExpression: "nome, materie_prezzi"
    }

    const res = await db.send(new ScanCommand(params));

    return Object.fromEntries(res.Items.map(b => [ b.nome.S, Object.keys(b.materie_prezzi.M) ]));
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
    const courses = await getBundleCourses(name);
    return Promise.all(courses.map(c => getFullNotesFileId(c)));
}

export const addPurchase = async (tguser: number, courses: string[]): Promise<void> => {
    const params: PutItemCommandInput = {
        TableName: "acquisti-appunti",
        Item: {
            tguser: {
                N: tguser.toString()
            },
            timestamp: {
                N: Date.now().toString()
            },
            courses: {
                SS: courses
            }
        }
    }

    await db.send(new PutItemCommand(params));
}

export const getCustomerIDs = async (from: Date = new Date(0), to: Date = new Date()): Promise<number[]> => {
    const params : ScanCommandInput = {
        TableName: "acquisti-appunti",
        ProjectionExpression: "tguser",
        FilterExpression: "#timestamp BETWEEN :from AND :to",
        ExpressionAttributeNames: {
            "#timestamp": "timestamp"
        },
        ExpressionAttributeValues: {
            ":from": { N: from.getTime().toString() },
            ":to": { N: to.getTime().toString() }
        }
    }

    const res = await db.send(new ScanCommand(params));

    /* Use a Set to return distinct user IDs */
    const userids_set = new Set(res.Items.map(i => i.tguser.N))

    return Array.from(userids_set).map(uid => parseInt(uid))
}

export const getPurchases = async (from: Date = new Date(0), to: Date = new Date()): Promise<Purchase[]> => {
    const params : ScanCommandInput = {
        TableName: "acquisti-appunti",
        ProjectionExpression: "tguser, courses",
        FilterExpression: "#timestamp BETWEEN :from AND :to",
        ExpressionAttributeNames: {
            "#timestamp": "timestamp"
        },
        ExpressionAttributeValues: {
            ":from": { N: from.getTime().toString() },
            ":to": { N: to.getTime().toString() }
        }
    }

    const res = await db.send(new ScanCommand(params));

    return res.Items.map(p => ({ 
                        tguser: p.tguser.N,
                        courses: p.courses.SS
                     }));
}