import { Construct } from "constructs";
import * as lambda from 'aws-cdk-lib/aws-lambda'

export type GeneralLambdaProps = {
    lambdaName: string;
    path: string;
    handler: string;
    envVars?: Record<string,string>
}

export class GeneralLambda extends Construct {
    public readonly lambda: lambda.Function;

    constructor(scope: Construct, id: string, props: GeneralLambdaProps) {
        super(scope, id);

        this.lambda = new lambda.Function(this, id, {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: props.handler,
            code: lambda.Code.fromAsset(props.path),
            environment: props.envVars
        })
    }
}