#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NormalizerStack } from '../lib/normalizer-stack';
import { ContentFilterStack } from '../lib/content-filter-stack';
import { MessageTranslatorStack } from '../lib/message-translator-stack';
import { ClaimCheckStack } from '../lib/claim-check-stack';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag'
import { Aspects } from 'aws-cdk-lib';

const app = new cdk.App();

const allStacks = [
    new ContentFilterStack(app, 'ContentFilterStack'),
    new MessageTranslatorStack(app, 'MessageTranslatorStack'),
    new NormalizerStack(app, 'NormalizerStack'),
    new ClaimCheckStack(app, 'ClaimCheckStack'),
];

// Add the cdk-nag AwsSolutions Pack with extra verbose logging enabled.
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// Add the cdk-nag NagSuppressions to suppress the Nag warnings.
allStacks.forEach(stack => {
    NagSuppressions.addStackSuppressions(stack, [
        { id: 'AwsSolutions-IAM4', reason: 'Using AWS managed IAM policies to keep example simple, even though it does not restrict the permission to the resource scope.' },
        { id: 'AwsSolutions-IAM5', reason: 'Using default execution roles to keep example simple.' },
    ])
});

// For more information on using the CfnPipe resource, see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_pipes.CfnPipe.html