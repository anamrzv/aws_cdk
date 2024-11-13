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
    if (path.includes('getUser')) {
      const { username } = body;

      if (!username) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: 'Username is required to get a user.',
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
    } else if (path.includes('getItem')) {
      const { id } = body;

      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Item ID are required to get an item.' }),
        };
      }

      tableName = process.env.ITEM_TABLE!;

      params = {
        TableName: tableName as string,
        Key: {
          id: id
        }
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid route' }),
      };
    }

    // Execute the put operation to insert the new user
    let foundElements = await dynamodb.get(params).promise();

    // Return a success response with the username
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: path.includes('getUser')
          ? `Found element with name ${params.Key.username}: `
          : `Found item with id ${params.Key.id}: `,
        foundElement: foundElements.Item
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