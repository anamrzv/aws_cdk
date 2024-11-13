import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { GeneralLambda } from './construct/lambda';


import path = require('path');

export class CloudCompTransferToCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    ////// DB
    const userTable = new dynamodb.Table(this, "Users", {
      partitionKey: { name: "username", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const itemTable = new dynamodb.Table(this, "Items", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    ////// LAMBDA
    const getFunc = new GeneralLambda(this, "Read", {
      handler: 'readHandler.handler',
      lambdaName: 'read-lambda',
      path: path.join(__dirname, '../lambda'),
      envVars: {
        USER_TABLE: userTable.tableName,
        ITEM_TABLE: itemTable.tableName,
      }
    })

    const createFunc = new GeneralLambda(this, "Create", {
      handler: 'createHandler.handler',
      lambdaName: 'create-lambda',
      path: path.join(__dirname, '../lambda'),
      envVars: {
        USER_TABLE: userTable.tableName,
        ITEM_TABLE: itemTable.tableName,
      }
    })

    const deleteFunc = new GeneralLambda(this, "Delete", {
      handler: 'deleteHandler.handler',
      lambdaName: 'delete-lambda',
      path: path.join(__dirname, '../lambda'),
      envVars: {
        USER_TABLE: userTable.tableName,
        ITEM_TABLE: itemTable.tableName,
      }
    })

    // Grant permissions to Lambda functions
    userTable.grantReadWriteData(getFunc.lambda);
    userTable.grantReadWriteData(createFunc.lambda);
    userTable.grantReadWriteData(deleteFunc.lambda);

    itemTable.grantReadWriteData(getFunc.lambda);
    itemTable.grantReadWriteData(createFunc.lambda);
    itemTable.grantReadWriteData(deleteFunc.lambda);

    ////// API
    const generalApi = new apigateway.RestApi(this, "GeneralApi", {
      description: "API for all lambda"
    })

        // For Users
    const usersPath = generalApi.root.addResource('users')
    const getUser = usersPath.addResource('getUser')
    getUser.addMethod("GET", new apigateway.LambdaIntegration(getFunc.lambda))

    const deleteUser = usersPath.addResource('deleteUser')
    deleteUser.addMethod("DELETE", new apigateway.LambdaIntegration(deleteFunc.lambda))

    const createUser = usersPath.addResource('createUser')
    createUser.addMethod("POST", new apigateway.LambdaIntegration(createFunc.lambda))

        // For Items
    const itemsPath = generalApi.root.addResource('items');
    const getItem = itemsPath.addResource('getItem');
    getItem.addMethod("GET", new apigateway.LambdaIntegration(getFunc.lambda));

    const deleteItem = itemsPath.addResource('deleteItem');
    deleteItem.addMethod("DELETE", new apigateway.LambdaIntegration(deleteFunc.lambda));

    const addItem = itemsPath.addResource('addItem');
    addItem.addMethod("POST", new apigateway.LambdaIntegration(createFunc.lambda));
    
  }
}
