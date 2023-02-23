import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as pipes from 'aws-cdk-lib/aws-pipes';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';

export class MessageTranslatorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const deadLetterQueue = new sqs.Queue(this, 'ClaimCheckDeadLetterQueue', {
      enforceSSL: true,
    });

    const sourceQueue = new sqs.Queue(this, 'MessageTranslatorSourceQueue', {
      enforceSSL: true,
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: deadLetterQueue,
      }
    });

    const targetStepFunctionsWorkflow = new sfn.StateMachine(this, 'MessageTranslatorTargetStepFunctionsWorkflow', {
      definition: sfn.Chain.start(new sfn.Pass(this, 'Process Message', {})),
      tracingEnabled: true,
      logs: {
        destination: new logs.LogGroup(this, 'MessageTranslatorTargetStepFunctionsWorkflowLogGroup', {
          logGroupName: '/aws/vendedlogs/MessageTranslatorTargetStepFunctionsWorkflowLogGroup',
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        level: sfn.LogLevel.ALL,
      },
    });

    // As described in the blog post, we would probably use either API Destinations or API Gateway to integrate with a geocoding endpoint.
    // To still be able to explore the pattern, this sample uses a Lambda function to simulate the geocoding endpoint.
    // At the end of the file, you can find the key constructs to create an API destination.
    const enrichmentLambda = new lambda.Function(this, 'MessageTranslatorEnrichmentLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lib/lambda'),
      handler: 'messageTranslatorEnrichmentLambda.handler',
    });

    // role with permission to read events from the source queue and write to the target step functions workflow
    const pipeRole = new iam.Role(this, 'MessageTranslatorRole', {
      assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com'),
    });

    sourceQueue.grantConsumeMessages(pipeRole);
    targetStepFunctionsWorkflow.grantStartExecution(pipeRole);
    enrichmentLambda.grantInvoke(pipeRole);

    const messageTranslatorPipe = new pipes.CfnPipe(this, 'MessageTranslatorPipe', {
      roleArn: pipeRole.roleArn,
      source: sourceQueue.queueArn,
      target: targetStepFunctionsWorkflow.stateMachineArn,
      enrichment: enrichmentLambda.functionArn,
      sourceParameters: {
        sqsQueueParameters: {
          batchSize: 1,
        },
      },
      targetParameters: {
        stepFunctionStateMachineParameters: {
          invocationType: 'FIRE_AND_FORGET',
        },
      }
    });

    const messageTranslatorSampleDataCreator = new lambda.Function(this, 'MessageTranslatorSampleDataCreatorLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lib/lambda'),
      handler: 'messageTranslatorSampleDataCreator.handler',
      environment: {
        QUEUE_URL: sourceQueue.queueUrl,
      }
    });
    sourceQueue.grantSendMessages(messageTranslatorSampleDataCreator);

    NagSuppressions.addResourceSuppressions(deadLetterQueue, [
      {
        id: 'AwsSolutions-SQS3',
        reason: 'Resource is a dead-letter queue.'
      },
    ]);
  
    // Relevant outputs so that the user can trigger this pattern and watch it in action.
    new cdk.CfnOutput(this, "MessageTranslatorSampleDataCreatorLambdaArn", {
      value: messageTranslatorSampleDataCreator.functionArn,
      exportName: "MessageTranslatorSampleDataCreatorLambdaArn",
      description: "The Arn of the Lambda function that can be used to test the Claim Check Pipe. Invoke this function to see the pipe in action.",
    });
    new cdk.CfnOutput(this, "TargetStepFunctionsWorkflowArn", {
      value: targetStepFunctionsWorkflow.stateMachineArn,
      exportName: "TargetStateMachineArn",
      description: "The ARN of the target workflow. After invoking the SampleDataCreatorLambda, you can use this ARN to view the execution history of the workflow and see the result.",
    });

    // * These are the key constructs needed to create and use an API destination. This code will only work with additional configuration, e.g. in AWS Systems Manager & AWS Secrets Manager. 
/*
    Additional imports:
      import * as events from 'aws-cdk-lib/aws-events';
      import { SecretValue } from 'aws-cdk-lib';
      import * as ssm from 'aws-cdk-lib/aws-ssm';
      import * as apigateway from 'aws-cdk-lib/aws-apigateway';
    

    const connection = new events.Connection(this, 'Connection', {
      authorization: events.Authorization.apiKey('x-api-key', SecretValue.secretsManager('ApiSecretName')), // Configure authorization here
    });

        Configure your endpoint url, for example by retrieving it from AWS Systems Manager Parameter Store
    const endpointURL = ssm.StringParameter.fromStringParameterAttributes(this, 'MessageTranslatorEnrichmentURL', {
      parameterName: '/MyParameters/MessageTranslatorEnrichmentURL',
    }).stringValue;

    const enrichmentDestination = new events.ApiDestination(this, 'Destination', {
      connection,
      endpoint: endpointURL, 
      httpMethod: events.HttpMethod.GET,
    });
*/
    //  create an IAM policy to allow the pipe to invoke the API destination
    // const invokeApiDestinationPolicy = new iam.PolicyDocument({
    //   statements: [
    //     new iam.PolicyStatement({
    //       resources: [
    //          `arn:aws:events:${process.env.CDK_DEFAULT_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}:api-destination/*/*`,
/*          ],
          actions: ["events:InvokeApiDestination"],
        }),
      ],
    });

        role with permission to read events from the source queue and write to the target step functions workflow
    const pipeRole = new iam.Role(this, 'MessageTranslatorRole', {  // make sure to remove the definition of the pipeRole above
      assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com'),
      inlinePolicies: {
        invokeApiDestinationPolicy,
      },
    }); 

const messageTranslatorPipe = new pipes.CfnPipe(this, 'MessageTranslatorPipe', {
  roleArn: pipeRole.roleArn,
  source: sourceQueue.queueArn,
  target: targetStepFunctionsWorkflow.stateMachineArn,
  enrichment: enrichmentDestination.apiDestinationArn,
  sourceParameters: {
    sqsQueueParameters: {
      batchSize: 1,
    },
  },
  targetParameters: {
    stepFunctionStateMachineParameters: {
      invocationType: 'FIRE_AND_FORGET',
    },
  }
});
*/
  }
}

