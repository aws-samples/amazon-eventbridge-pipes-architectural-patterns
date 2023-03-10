const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb")
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.CLAIM_CHECK_TABLE;

async function retrieveElementWith(id) {
    console.log('retrieveElementWith(id)', id);
    
    const params = {
        TableName: tableName,
        Key: {
         'id': id
        }
    };
    
    return await ddbDocClient.send(new GetCommand(params));
}

exports.handler = async function (event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));

    var recordIds = event
        .map(element => element.body)
        .map(JSON.parse)
        .flatMap(event => event.detail.ids);

    console.log("recordIds:", recordIds);
    
    var result = await Promise.all(recordIds.map(retrieveElementWith))

    console.log("Success :", result.map(JSON.stringify));
    return result;
}