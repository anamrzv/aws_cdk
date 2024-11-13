import * as AWS from 'aws-sdk';

const dynamodb = new AWS.DynamoDB.DocumentClient({
    endpoint: 'http://dynamodb.localhost.localstack.cloud:4566'
});

export const handler = async (event: any) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const path = event.path;

        let tableName: string;
        let params: any;
        if (path.includes('createUser')) {
            const { username, email, age } = body;

            if (!username) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'Username is required to create a new user.',
                    }),
                };
            }

            tableName = process.env.USER_TABLE!;

            // Prepare the parameters for the DynamoDB put operation
            params = {
                TableName: tableName as string,
                Item: {
                    username: username,  // Partition key
                    email: email || null,  // Optional attribute
                    age: age || null       // Optional attribute
                },
                ConditionExpression: 'attribute_not_exists(username)', // Prevent overwriting existing users
            };
        } else if (path.includes('addItem')) {
            const { id, itemName, quantity } = body;

            if (!id || !itemName) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Item ID and name are required to add a new item.' }),
                };
            }

            tableName = process.env.ITEM_TABLE!;

            params = {
                TableName: tableName as string,
                Item: {
                    id,
                    itemName,
                    quantity: quantity || 0,
                },
                ConditionExpression: 'attribute_not_exists(id)', 
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid route' }),
            };
        }

        // Execute the put operation to insert the new user
        await dynamodb.put(params).promise();

        // Return a success response with the username
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: path.includes('createUser') 
                         ? `User ${params.Item.username} created successfully.` 
                         : `Item ${params.Item.itemName} added successfully.`,
                item: params.Item
            }),
        };

    } catch (error: any) {
        let errorMessage = 'An error occurred';

        // Check if error was due to an existing user
        if (error.code === 'ConditionalCheckFailedException') {
            errorMessage = `Object already exists.`;
        } else {
            errorMessage = error.message;
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: errorMessage,
            }),
        };
    }
};