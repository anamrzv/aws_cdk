import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { GeneralLambda } from './construct/lambda';

import path = require( 'path' );

export class CloudCompTransferToCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "SuperCoolBucket", {
      bucketName: 'super-cool-bucket'
    })

    const nameFunction = new GeneralLambda(this, "SuperCoolLambda", {
      handler: 'nameHandler.handler',
      lambdaName: 'super-cool-lambda',
      path: path.join(__dirname, '../lambda'),
      envVars: {
        BUCKET_NAME: bucket.bucketName
      }
    })

    bucket.grantReadWrite(nameFunction.lambda);

    const restapi = new apigateway.LambdaRestApi(this, "SuperCoolApi", {
      restApiName: 'super-cool-api',
      handler: nameFunction.lambda,
      proxy: false
    })
    const nameRoute = restapi.root.addResource("name")
    nameRoute.addMethod("POST")

  }
}
