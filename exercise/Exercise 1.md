# Cloud Fundamentals - Exercise 1

In this series of exercises, we will begin with hands-on practice in the realm of Cloud and DevOps. The objective of the first exercise is to set up the environment we will use, starting by manually deploying cloud resources via the CLI. For this purpose, we will use **LocalStack**.

**LocalStack** is a local testing environment that allows developers to simulate AWS services on their own machines. This enables the development and testing of cloud applications without the need for an actual connection to AWS. LocalStack supports many key AWS services such as S3, Lambda, DynamoDB, API Gateway, and more. As a result, developers can work faster and save costs by avoiding the use of real AWS resources during the development and testing phases. It is particularly useful for local integration testing and CI/CD pipelines.


## Task 1: Setting up LocalStack (Docker)

The easiest way to use LocalStack is through Docker. If you haven’t installed Docker yet, please do so:
[Docker Installation Guide](https://docs.docker.com/engine/install/)

Once Docker is set up, you can deploy and start LocalStack using the following command:

```bash
docker run --rm -dit -p 4566:4566 -p 4571:4571 -e LOCALSTACK_HOST=localhost -v /var/run/docker.sock:/var/run/docker.sock localstack/localstack
```

### Arguments 
**--rm:** Automatically removes the container once it stops. This is useful for containers you don’t need to keep after use.

**-dit:** Combines several flags:

1. -d runs the container in detached mode (in the background).

2. -i keeps STDIN open even if not attached, which is generally used in interactive containers. Without -t, the container will wait for input but might look visually unresponsive without a proper terminal display. When combined with -t, it behaves more like an interactive shell.

3. -t allocates a pseudo-TTY, making it easier to interact with the container’s shell if needed.

**-e LOCALSTACK_HOST=localhost:** Sets an environment variable LOCALSTACK_HOST to localhost within the container, configuring the LocalStack instance to communicate with the host machine.

**-v /var/run/docker.sock:/var/run/docker.sock:** Mounts the Docker socket from the host into the container, enabling LocalStack to manage Docker containers directly. This is often needed for LocalStack’s functionality that involves Docker.

**localstack/localstack:** Specifies the image name to use for the container. Here, it’s pulling from the LocalStack image on Docker Hub.

Afterward, check the container logs to ensure everything is deployed correctly:

```bash
docker logs --follow <ContainerId>
```

You can get the ContainerId with the following command:

```bash
docker ps
```

The output should look similar to this:

```
LocalStack version: 3.8.2.dev40  
LocalStack build date: 2024-10-18  
LocalStack build git hash: 28e81d1f0
```


## Task 2: Setting up the AWS CLI

We will use the AWS CLI to make API calls to LocalStack, which will simulate the AWS API. The first step is to install the AWS CLI:
[AWS CLI Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

Now, configure the CLI to interact with LocalStack by creating two files:

```bash
touch ~/.aws/config  
touch ~/.aws/credentials
```

Add the following content to the `config` file:

```bash
[profile hsh]  
region = eu-central-1  
source_profile = hsh  
endpoint_url = http://localhost:4566
```

In the `credentials` file, add:

```bash
[hsh]  
aws_access_key_id = test  
aws_secret_access_key = test  
aws_default_region = eu-central-1
```

This configuration creates an AWS profile named `hsh` that points to `http://localhost:4566`. If your LocalStack is using different ports, be sure to adjust them here.


## Task 3: Testing the CLI

Now that everything is set up, we can start using the CLI. To avoid specifying the profile for every command, set the AWS_PROFILE environment variable:

```bash
export AWS_PROFILE=hsh
```

Let's create an S3 bucket to test the CLI:

```bash
aws s3 mb s3://my-test-bucket
```

The output should look like this:

```
make_bucket: my-test-bucket
```

You should also see the following log entry in the LocalStack logs:

```
2024-10-20T08:00:06.377  INFO --- [et.reactor-1] localstack.request.aws     : AWS s3.CreateBucket => 200
```

You can list all created buckets with:

```bash
aws s3 ls
```


## Task 4: Creating a Hello-World Lambda

Next, let’s create a Hello-World Lambda function. Start by creating a new folder (e.g., `hello-world`) and installing the necessary AWS SDK and TypeScript dependencies:

```bash
npm init -y
npm install aws-sdk @types/aws-sdk typescript --save-dev && npm i --save-dev @types/node
```

Inside the folder, create a `tsconfig.json` file with the following content:

```json
{
  "compilerOptions": {
    "target": "es5",
    "module": "commonjs",
    "moduleResolution": "node",
    "allowJs": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "resolveJsonModule": true,
    "declaration": false,
    "outDir": "dist/",
    "lib": ["es7", "dom"]
  },
  "include": ["src/"]
}
```

To assign an IAM policy (this will be covered in the second lecture), create an `iam/` folder and add a `policy.json` file with the following content:

```json
{
  "Version": "2012-10-17",
  "Statement": {
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }
}
```

Next, run the following CLI command to add the assume role policy:

```bash
aws iam create-role --role-name lambda-ex --assume-role-policy-document file://~/Projects/Hochschule/Softwarearchitektur/Uebung_1/hello-world/iam/policy.json

file:///Users/anamun/Hochschule/cloud_comp/iam/policy.json
```

Now, create a new `src/` folder and add a `hello-world.ts` file. Here’s a simple implementation for the Lambda function (feel free to modify it):

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello, World!',
      input: event,
    }),
  };
};
```

You may need to install the `aws-lambda` package:

```bash
npm install aws-lambda
```

Now, compile your TypeScript code to JavaScript and bundle everything into a ZIP file:

```bash
npx tsc  # Compiles TypeScript to JavaScript
zip -r hello-world-lambda.zip dist/ node_modules/
```

Finally, upload the Lambda function to AWS:

```bash
aws lambda create-function \
  --function-name helloWorldFunction \
  --runtime nodejs18.x \
  --zip-file fileb://hello-world-lambda.zip \
  --handler dist/hello-world.handler \
  --role arn:aws:iam::123456789012:role/lambda-ex
```

Make sure the handler points to the correct location of the Lambda function inside the ZIP file.

To invoke the Lambda function, use the following command:

```bash
aws lambda invoke --function-name helloWorldFunction response.json
```

The output of `cat response.json` should be:

```json
{"statusCode":200,"body":"{\"message\":\"Hello, World!\",\"input\":{}}"}
```

## Task 5: Creating a Lambda Function with API Gateway to Store and Retrieve a Name in S3

In this task, we will extend the Hello-World Lambda by integrating it with an API Gateway to make it accessible via HTTP. The Lambda function will store the last name sent in the request to an S3 bucket and always return the last stored name when called.

### Steps:
1. **Create a new Folder and set up the folder structure like before**

2. **Create the S3 Bucket**

   First, create a new S3 bucket where the Lambda function will store the names:

   ```bash
   aws s3 mb s3://my-bucket
   ```

3. **Update the Lambda Function**

   Modify the Lambda function to read from and write to the S3 bucket. The function should accept a name in the request body, store it in the bucket, and return the last saved name.

   Update the `hello-world.ts` file to:

   ```typescript
   import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
   import { S3 } from 'aws-sdk';

   const s3 = new S3({,
        s3ForcePathStyle: true, 
        endpoint: 'http://s3.localhost.localstack.cloud:4566',
    });
   const bucketName = 'my-bukcet';
   const fileName = 'last-name.txt';

   export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
     } catch (error) {
       return {
         statusCode: 500,
         body: JSON.stringify({
           message: 'An error occurred',
           error: error.message
         }),
       };
     }
   };
   ```

4. **Compile and Bundle the Lambda**

   Compile the TypeScript code and create a new ZIP file for the updated Lambda function:

   ```bash
   npx tsc
   zip -r hello-world-lambda dist/ node_modules/
   ```

5. **Create Role for lambda**
   
   Create an assume-role policy in the file named **iam/assume-role.json**
   ```json
   {
        "Version": "2012-10-17",
        "Statement": {
        "Effect": "Allow",
        "Principal": { "Service": "lambda.amazonaws.com" },
        "Action": "sts:AssumeRole"
        }
    }
   ```

   Create a role-policy to access the bucket named **iam/bucket-access.json**
   ```json
    {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:ListObjects"
        ],
        "Resource": "arn:aws:s3:::my-bucket/*"
      }
    ]
    }
   ```

   Now let's create the role
   ```bash
    aws iam create-role --role-name lambda-s3-role \
         --assume-role-policy-document file://iam/assume-role.json

    aws iam put-role-policy --role-name lambda-s3-role \
         --policy-name lambda-s3-write-policy \
         --policy-document file://iam/bucket-access.json
   ```

   Now we have a role, which can be assumed by lambdas and can perform CRUD-Operations to the bucket.

6. **Deploy the Lambda Function**

   Upload the updated Lambda function:

   ```bash
    aws lambda create-function \
         --function-name lastName \
         --runtime nodejs18.x \
         --zip-file fileb://hello-world-lambda.zip \
         --handler dist/hello-world.handler \
         --role arn:aws:iam::123456789012:role/lambda-s3-role
   ```

7. **Create and Configure an API Gateway**

   Now, let's create an API Gateway that invokes the Lambda function when accessed via HTTP:

   ```bash
   aws apigateway create-rest-api --name "HelloWorldAPi"
   ```

   Get the API ID:

   ```bash
   aws apigateway get-rest-apis
   ```

   Now, create a resource and a POST method under this API:

   ```bash
   aws apigateway create-resource --rest-api-id <restApiId> --parent-id <rootResourceId> --path-part name
   ```

   Add a POST method to the `/name` resource:

   ```bash
   aws apigateway put-method \
     --rest-api-id <restApiId> \
     --resource-id <resourceIdOfNameRoute> \
     --http-method POST \
     --authorization-type NONE
   ```

   Integrate the Lambda function with the POST method:

   ```bash
   aws apigateway put-integration \
     --rest-api-id <restApiId> \
     --resource-id <resourceIdOfNameRoute> \
     --http-method POST \
     --type AWS_PROXY \
     --integration-http-method POST \
     --uri arn:aws:apigateway:eu-central-1:lambda:path/2015-03-31/functions/arn:aws:lambda:eu-central-1:000000000000:function:lastName/invocations
   ```

8. **Deploy the API**

   Finally, deploy the API to make it publicly accessible:

   ```bash
   aws apigateway create-deployment \
     --rest-api-id <restApiId> \
     --stage-name prod
   ```

9.  **Test the API**

   Now you can test the API. You can send a POST request with a name in the body to store and retrieve the last saved name.

   Example POST request:

   ```bash
   curl -X POST http://localhost:4566/restapis/<restApiId>/prod/_user_request_/name -d '{"name": "John"}' -H "Content-Type: application/json"

   ```

   The Lambda function will respond with:

   ```json
   {
     "message": "Last saved name",
     "name": "John"
   }
   ```

   If you call the API again with another name, the response will return the updated name.

### Expected Output:

1. First request (e.g., `{"name": "Alice"}`):

   ```json
   {
     "message": "Last saved name",
     "name": "Alice"
   }
   ```

2. Second request (e.g., `{"name": "Bob"}`):

   ```json
   {
     "message": "Last saved name",
     "name": "Bob"
   }
   ```

With this task, you’ve integrated an API Gateway with a Lambda function and enabled it to interact with an S3 bucket to store and retrieve data.

## Task 6: Analysis of Manual Deployment – Pros, Cons, and Improvement Suggestions
In this task, you will analyze the manual deployment process used in the previous exercises. The goal is to identify the advantages and disadvantages of this approach and propose improvements to streamline and automate the process.

### Step 1: Analyze the Advantages of Manual Deployment
Take a moment to consider the advantages of manually deploying resources (e.g., Lambda functions, API Gateway, S3 buckets, etc.)

### Step 2: Analyze the Disadvantages of Manual Deployment
Next, think about the disadvantages of manual deployment. Reflect on the challenges and bottlenecks you faced while deploying resources manually.

### Step 3: Suggest Improvements to the Process
Based on the pros and cons identified in the previous steps, propose strategies for improving the deployment process.