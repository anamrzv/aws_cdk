# Exercise 2
In the previous exercise, we observed how labor-intensive it is to set up infrastructure manually. We have to constantly pay attention to IDs, and any mistake renders the entire deployment unusable.

In this exercise, our goal is to deploy our application using Infrastructure as Code (IaC). For this, we will use AWS CDK.

We can configure CDK to use LocalStack to deploy cloud resources locally.

## Aufgabe 1 - Aufsetzen von AWS CDK
Run the following command to install AWS CDK:

```bash
npm install -g aws-cdk
```
Once done, AWS CDK is installed globally.

Next, we need to install another package to use CDK locally:
```bash
npm install -g aws-cdk-local
```

If you didn't complete the previous exercise, please install AWS CLI v2.

Now, we’re ready to run AWS CDK locally.

## Task 2 - Testing if our Environment Works
First, start LocalStack:
```bash
docker run --rm -dit -p 4566:4566 -p 4571:4571 -e LOCALSTACK_HOST=localhost -v /var/run/docker.sock:/var/run/docker.sock localstack/localstack
```

Then, let’s create our first IaC project:

```bash
mkdir uebung_2
cd uebung_2
cdk init app --language typescript
```

Now we have a CDK project set up. Next, install the dev dependencies:

```bash
npm install aws-cdk-local --save-dev
```

To ensure CDK uses LocalStack, update the configuration. Open cdk.json and add:
```json
"context": {
    "awsProfile": "localstack"
  }
```

Now, let’s create a small Lambda and an S3 bucket. The Lambda will have access to the bucket and can read from it. Open **lib/exercise_2-stack.ts** and add this code:
```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class Uebung2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket
    const bucket = new s3.Bucket(this, 'LocalStackBucket', {
      bucketName: 'localstack-bucket',
    });

    // Lambda function
    const func = new lambda.Function(this, 'LocalStackLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async function(event) {
          console.log("Hello from LocalStack Lambda!");
          return { statusCode: 200, body: "Hello, World!" };
        }
      `),
    });

    // Grant Lambda access to the S3 bucket
    bucket.grantReadWrite(func);
  }
}
```

Next, we bootstrap our LocalStack environment to prepare the required resources for CDK:
```bash
cdklocal bootstrap
```

Now, deploy the infrastructure:
```bash
cdklocal deploy
```

Check LocalStack’s logs to confirm all resources were created automatically. Let’s verify that the resources exist:
```bash
aws s3 ls
```
Expected output:
```
2024-10-26 07:57:16 cdk-hnb659fds-assets-000000000000-us-east-1
2024-10-26 07:58:07 localstack-bucket
```

To invoke the Lambda function, we need its FunctionName:
```bash
aws lambda list-functions
```

Expected output:
```json
{
    "Functions": [
        {
            "FunctionName": "Uebung2Stack-LocalStackLambdaF48F22A9-c730d721",
            "FunctionArn": "arn:aws:lambda:us-east-1:000000000000:function:my-test-lambda",
            "Runtime": "nodejs18.x",
            "Role": "arn:aws:iam::000000000000:role/Uebung2Stack-LocalStackLambdaServiceR-e85f396c",
            "Handler": "index.handler",
            "CodeSize": 301,
            "Description": "",
            "Timeout": 3,
            "MemorySize": 128,
            "LastModified": "2024-10-26T06:19:10.379077+0000",
            "CodeSha256": "3znSX2xaHmzY6stxSPJpPuqe29ZEBdtWcDV+vHayR2o=",
            "Version": "$LATEST",
            "TracingConfig": {
                "Mode": "PassThrough"
            },
            "RevisionId": "8c9b3051-77f0-463e-b7d1-7ae6361c24d0",
            "PackageType": "Zip",
            "Architectures": [
                "x86_64"
            ],
            "EphemeralStorage": {
                "Size": 512
            },
            "SnapStart": {
                "ApplyOn": "None",
                "OptimizationStatus": "Off"
            }
            ....
```

Let’s make the function name more readable by updating our CDK code as follows:
```typescript
    const func = new lambda.Function(this, 'LocalStackLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      functionName: 'my-test-lambda',
      code: lambda.Code.fromInline(`
        exports.handler = async function(event) {
          console.log("Hello from LocalStack Lambda!");
          return { statusCode: 200, body: "Hello, World!" };
        }
      `),
    });
```

Now redeploy the CDK stack:
```bash
cdklocal deploy
```

Re-run aws lambda list-functions, and you’ll see the updated function name. This small example demonstrates how easy it is to manage infrastructure changes with IaC.

Invoke the Lambda function:
```bash
aws lambda invoke --function-name my-test-lambda response.json
```

The response.json should contain:
```json
{"statusCode":200,"body":"Hello, World!"}
```

## Task 3 - Migrating Exercise 1 to IaC
Now, we want to convert Task 5 from the first exercise sheet to IaC. Try it on your own first; a guide follows if needed.

```bash
mkdir Task_3
cd Task_3
cdk init app --language typescript
Anpassen der cdk.json wie zuvor
```


The following folder structure will be used:
```
Task_3/
├── lambda/
│   └── nameHandler.ts
│   └── node_modules
│   └── nameHandler.js
│   └── ...
├── lib/
│   └── task_3-stack.ts
│   └── constructs
│       └── lambda.ts
├── cdk.json
├── node_modules
└── ...
```

Here’s the Lambda code:
```typescript
import { S3 } from 'aws-sdk';

const s3 = new S3({
    s3ForcePathStyle: true, 
    endpoint: 'http://s3.localhost.localstack.cloud:4566',
});

const bucketName = process.env.BUCKET_NAME!;
const fileName = 'last-name.txt';

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const name = body.name || 'Unknown';

    // Save name to S3
    await s3.putObject({
      Bucket: bucketName,
      Key: fileName,
      Body: name,
    }).promise();

    // Retrieve last saved name from S3
    const lastSavedName = await s3.getObject({
      Bucket: bucketName,
      Key: fileName,
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Last saved name',
        name: lastSavedName.Body?.toString() || 'No name found',
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An error occurred', error: (error as Error).message }),
    };
  }
};
```
Next, install the Lambda dependencies and compile it:
```bash
cd lambda
npm init -y
npm install aws-sdk
npx tsc nameHandler.ts
```


In task_3-stack.ts, add:
```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { HshLambda } from './constructs/lambda';
import { join } from 'path';
import path = require( 'path' );
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';


export class Task3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'Task3Bucket', {
      bucketName: 'task3bucket',
    });

    const nameLambda = new HshLambda(this, 'NamingLambda', {
      lambdaName: 'name-lambda',
      assetPath: path.join(__dirname, '../lambda'),
      handler: 'nameHandler.handler',
      envVars: {
        BUCKET_NAME: bucket.bucketName,
      }
    });

    bucket.grantReadWrite(nameLambda.lambda);

    // API Gateway to invoke the Lambda function via HTTP
    const api = new apigateway.RestApi(this, 'NameHandlerApi', {
      restApiName: 'Name Handler Service',
      description: 'API Gateway to invoke Lambda for storing and retrieving names.',
    });

    const nameResource = api.root.addResource('name');
    nameResource.addMethod('POST', new apigateway.LambdaIntegration(nameLambda.lambda));
  }
}
```

Please note that I have created a dedicated class for the Lambda resource. This approach allows us to create multiple Lambda functions with similar properties using this class. This way, we can add various assets and subsequently integrate them into our application and reuse them. Here is the code for this construct (resource class) in lib/construct/lambda.ts:
```typescript
import { Construct } from "constructs";
import * as lambda from 'aws-cdk-lib/aws-lambda';


export type HshLambdaProps = {
    lambdaName: string;
    assetPath: string;
    handler: string;
    envVars?: Record<string,string>,
}

export class HshLambda extends Construct {
    public readonly lambda: lambda.Function;

    constructor(scope: Construct, id: string, props: HshLambdaProps) {
        super(scope, id);

        this.lambda = new lambda.Function(this, id, {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: props.handler,
            code: lambda.Code.fromAsset(props.assetPath),
            environment: props.envVars,
        })
    }
}
```

Now deploy the application:
```bash
cdklocal synth
cdklocal deploy
```

The output should be:
```
Task3Stack: deploying... [1/1]
Task3Stack: creating CloudFormation changeset...

 ✅  Task3Stack

✨  Deployment time: 10.18s

Outputs:
Task3Stack.NameHandlerApiEndpoint6C91C134 = https://czn5tu6hdh.execute-api.localhost:4566/prod/
Stack ARN:
arn:aws:cloudformation:us-east-1:000000000000:stack/Task3Stack/da21dcae

✨  Total time: 14.35s
```

You can see the API Gateway endpoint in the output. Use this to test the application:
```bash
curl -k -X POST https://czn5tu6hdh.execute-api.localhost:4566/prod/name \
       -d '{"name": "John"}' -H "Content-Type: application/json"


{"message":"Last saved name","name":"John"}⏎   

curl -k -X POST https://bkuupxtk3l.execute-api.localhost:4566/prod/users/createUser \
       -d '{"username": "John", "email": "test", "age": "18"}' -H "Content-Type: application/json"

curl -k -X GET https://bkuupxtk3l.execute-api.localhost:4566/prod/users/getUser \
       -d '{"username": "John" }' -H "Content-Type: application/json"

curl -k -X DELETE https://bkuupxtk3l.execute-api.localhost:4566/prod/users/deleteUser \
       -d '{"username": "John" }' -H "Content-Type: application/json"       
```

You can see that using IaC has made it significantly easier to deploy the application. Changes to the infrastructure and code are straightforward to implement.

## Task 3 - Inventory Management System
Create a simple inventory management system composed of multiple Lambda functions. The system should support the following operations:

- Creating users
- Adding items
- Deleting/updating items
- Deleting/updating users

### Steps
1. Design an Architecture Diagram: Start by outlining the architecture for the inventory management system.
2. Implementation: After finalizing the architecture, implement the system by creating Lambda functions for each operation.

### Optional Extension
If time permits, create a simple website that can be deployed to an S3 bucket with static website hosting enabled. In the next exercise, we will set up CI/CD to automatically deploy this application on AWS. Static website hosting can be configured by s3 and cdk. Please note, that you can't upload files via cdk to the s3 bucket, because you would need the pro version of localstack. Instead deploy a bucket with website hosting and copy the files via cli to the bucket. (aws s3 cp)

Erstellen Sie zuerst ein Architekturdiagramm und Implementieren Sie dieses im Anschluss.

Wenn Sie noch Zeit haben, erstellen Sie eine kleine Webseite, welche in einem S3 Bucket (mit static Website hosting enabled). Deployed wird. Diese Anwendung wollen wir in der nächsten Übung mit Hilfe von CI/CD automatisch auf AWS Deployen.


Your architecture might look something like this:
```
+----------------------------------------------------------------------+
|                     Inventory Management System                      | 
+----------------------------------------------------------------------+
|                                                                      |
|                       +------------------+                           |
|                       |    API Gateway   |                           |
|                       +------------------+                           |
|                                |                                     |
|     +--------------------------+--------------------------+          |
|     |                          |                          |          |
|     v                          v                          v          |
| +----------------+      +-----------------+    +--------------------+|
| |  POST /users   |      |  PUT /users/{id}|    | DELETE /users/{id} ||
| |  POST /items   |      |  PUT /items/{id}|    | DELETE /items/{id} ||
| +----------------+      +-----------------+    +--------------------+|
|          |                      |                      |             |
|          v                      v                      v             |
| +----------------+     +----------------+     +----------------+     |
| |  CreateLambda  |     |  UpdateLambda  |     |  DeleteLambda  |     |
| +----------------+     +----------------+     +----------------+     |
|          |                      |                      |             |
|          v                      v                      v             |
|      +-------------------------------------------------------+       |
|      |                   DynamoDB Table                      |       |
|      +-------------------------------------------------------+       |
|      |   PK             |  SK           |  Attributes        |       |
|      |------------------|---------------|--------------------|       |
|      | User#UserID      | UserDetails   | {name, email, ...} |       |
|      | Item#ItemID      | ItemDetails   | {name, price, ...} |       |
|      +-------------------------------------------------------+       |
|                                                                      |
+----------------------------------------------------------------------+
```

As a starting point, an API Gateway is used once again, with DynamoDB as the database. A complete solution will be released on 04.11.2024.

### Hints
- Keep in mind that you have to add the enpoint urls to your sdk clients 
```typescript
For S3:
const s3 = new S3({
    s3ForcePathStyle: true, 
    endpoint: 'http://s3.localhost.localstack.cloud:4566',
});

For Dynamodb
const dynamodb = new DynamoDB.DocumentClient({
    endpoint: 'http://dynamodb.localhost.localstack.cloud:4566'
});
```
- Everytime you change your lambda code, you have to compile it with **npx tsc filename** (We will automate this, with a ci/cd pipeline in the next exercise).
- Dig deeper into the cdk and sdk docuementation
- Some services are only usable in the pro version of localstack (https://docs.localstack.cloud/user-guide/aws/feature-coverage/). Marked with (Pro)

## Task 4 Identify improvements
Review the current implementation of the inventory management system and identify areas for potential improvement. Consider the following aspects:

- Code Optimization: Review the Lambda functions and other code components for efficiency. Are there redundancies or opportunities to simplify the logic?

- Error Handling: Evaluate the error handling within each Lambda function. Are errors managed gracefully, and do they provide meaningful feedback?

- Scalability: Consider the scalability of the system. Are there any limitations that could impact performance as the user or item count increases?

- Security Enhancements: Review security configurations, such as permissions for the Lambda functions and DynamoDB. Are there areas where security can be strengthened?

- Cost Optimization: Analyze the resources used in the architecture (e.g., DynamoDB read/write capacities, Lambda memory and timeout settings) for cost efficiency. Are there adjustments that could reduce operational costs?

### Task
Document your findings, and for each identified improvement, suggest possible solutions or enhancements. Additionally, prioritize the improvements based on their impact on the system’s performance, security, and maintainability.