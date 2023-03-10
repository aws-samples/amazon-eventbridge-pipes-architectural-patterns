const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand} = require('@aws-sdk/lib-dynamodb');
const tableName = process.env.CLAIM_CHECK_TABLE;

async function writeToDb(item) {
    // put the message in the table
    const params = {
        TableName: tableName,
        Item: item
    };

    const client = new DynamoDBClient();
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    return await ddbDocClient.send(new PutCommand(params));
}

exports.handler = async function (event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    var bodies = event
    .map(element => element.body)
    .map(JSON.parse)

    console.log("bodies:", bodies);

    var result = await Promise.all(bodies.map(writeToDb))
    console.log("Success :", result.map(JSON.stringify));

    const resonse = {
        eventType: "Some_Event_Type",
        ids: bodies
                .map(element => element.id)
    }
    console.log('response:', resonse);
    return resonse;
}