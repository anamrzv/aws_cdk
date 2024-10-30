import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3 } from 'aws-sdk';

const s3 = new S3({
     s3ForcePathStyle: true, 
     endpoint: 'http://s3.localhost.localstack.cloud:4566',
});

const bucketName = process.env.BUCKET_NAME!;
const fileName = 'last-name.txt';

export const handler = async (event: any) => {
  try {
    // Parse the name from the request body
    const body = JSON.parse(event.body || '{}');
    const name = body.name || 'Unknown';

    // Write the name to S3
    await s3.putObject({
      Bucket: bucketName,
      Key: fileName,
      Body: name
    }).promise();

    // Read the last saved name from S3
    const lastSavedName = await s3.getObject({
      Bucket: bucketName,
      Key: fileName
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Last saved name',
        name: lastSavedName.Body?.toString() || 'No name found'
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'An error occurred',
        error: error.message
      }),
    };
  }
};