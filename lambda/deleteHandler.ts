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
        if (path.includes('deleteUser')) {
            const { username } = body;

            if (!username) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'Username is required to delete a user.',
                    }),
                };
            }

            tableName = process.env.USER_TABLE!;

            // Prepare the parameters for the DynamoDB put operation
            params = {
                TableName: tableName as string,
                Key: {
                    username: username,  // Partition key
                }
            };
        } else if (path.includes('deleteItem')) {
            const { id } = body;

            if (!id) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Item ID are required to delete an item.' }),
                };
            }

            tableName = process.env.ITEM_TABLE!;

            params = {
                TableName: tableName as string,
                Key: {
                    id: id
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
        await dynamodb.delete(params).promise();

        // Return a success response with the username
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: path.includes('deleteUser')
                    ? `User with name ${params.Key.username} deleted successfully.`
                    : `Item with id ${params.Key.id} deleted successfully.`
            }),
        };

    } catch (error: any) {
        let errorMessage = 'An error occurred';
        errorMessage = error.message;

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: errorMessage,
            }),
        };
    }
};