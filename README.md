# Implementing architectural patterns with Amazon EventBridge Pipes 
## Overview
This repositiory implements 4 common enterprise integration patterns using Amazon EventBridge Pipes:
- Content Filter pattern,
- Message Translator pattern,
- Normalizer pattern and
- Claim Check pattern

When building software, we often incorporate architectural patterns. These patterns are
technology-agnostic blueprints which solve recurring challenges in software design.
Typically, they have been applied and vetted many times before being labeled a pattern.
Specifically, when building solutions that consist of multiple distributed components,
we may rely on enterprise integration patterns. Enterprise integration patterns help us
design and build distributed applications or integrate additional components or third-
party services into existing applications.
This post demonstrates how we can implement four commonly used enterprise
integration patterns using Amazon EventBridge Pipes, helping you simplify your
architecture. Amazon EventBridge Pipes is a feature of Amazon EventBridge that helps
you connect your AWS resources with each other. Using Amazon EventBridge Pipes can
reduce the complexity of your integrations and reduces the amount of code you will
need to write and maintain.

## Patterns
Each pattern is contained in its own stack. That means, you can deploy all of them individually to see how they work.
You will find the ARNs (Amazon Resource Name) of relevant resources in each stack's AWS CloudFormation output, so that you can locate them easily.

### Content Filter pattern
The content filter pattern removes unwanted content from a message before forwarding it to a downstream system. 

#### Goal
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture1_d.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture1.png">
  <img alt="Shows that events of type USER_CREATED are deleted, and events of type ORDER are modified to not contain the attributes user_name and birthday anymore." src="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture1.png">
</picture>

#### Architecture Diagram
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture2_d.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture2.png">
  <img alt="Architecture diagram which connects two Kinesis streams using a pipe with filter and input transformer." src="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture2.png">
</picture>

#### Try it out!
Step-by-step instructions to understand the implementation for the pattern:
1. Deploy the ContentFilterStack
2. Trigger the ContentFilterTestLambda-function to generate two sample events on the sourceStream.
3. Look at the SourceStream: you will find two records per ContentFilterTestLambda-execution, including PII-data.
4. Look at the TargetStream, you will find that only the ORDER event has been forwarded, and it does not contain personal data anymore.

### Message Translator pattern
In an event-driven architecture, event senders and receivers are independent from each other, and for that reason, the events they exchange may have different formats. To allow communication between different components, a translation of these events is needed, known as the Message Translator pattern. For example, an event contains an address, but the consumer expects coordinates.

#### Goal
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture3_d.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture3.png">
  <img alt="Shows an original event with an address attribute saying 1600, Pennsylvania Avenue NW, Washington, DC 20500, USA and a modified event with coordinates of this location." src="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture3.png">
</picture>

#### Architecture Diagram
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture4_d.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture4.png">
  <img alt="Architecture diagram which connects an SQS with AWS Step Functions using a pipe with an API destination enrichment." src="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture4.png">
</picture>

#### Try it out!
Because the MessageTranslatorStack would requires an existing external endpoint, for demonstration purposes this pattern is implemented using a lambda function which mocks the result. This way, any user can test it without the need for an geolocation API.
1. Trigger the MessageTranslatorSampleDataCreatorLambda-function to generate an example event with an address.
2. Take a look at the MessageTranslatorTargetStepFunctionsWorkflow to see the result.

### Normalizer pattern
The idea behind the normalizer is similar to what we have seen in the message translator, but now we have various source components, which all have different formats for events. The normalizer pattern then routes each event type through its specific message translator, so that our downstream systems process messages with a unified structure.

#### Goal
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture5_d.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture5.png">
  <img alt="Shows three original event with varying formats for the name attribute, and a resulting event with a unified structure for the name." src="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture5.png">
</picture>

#### Architecture Diagram
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture6_d.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture6.png">
  <img alt="Architecture diagram which connects an SQS with EventBridge, using a pipe that does enrichment via Step Functions. The Step Functions workflow first checks the type of an event and based on the result branches into state unifyA, unifyB or unifyC." src="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture6.png">
</picture>

#### Try it out!
Step-by-step instructions to understand the implementation for the pattern:
1. Deploy the NormalizerStack
2. Trigger the NormalizerSampleDataCreatorLambda to create three sample events with different structure.
3. Check the Amazon CloudWatch Log group '/aws/events/normalizerTargetLog' to see the unified events.

### Claim Check pattern
When passing around messages in an event-driven application, we often do not want our messages to contain all details. For example, an event containing a “userID” may not need additional information about this particular user, because relevant information can always be retrieved using this userID. This approach is referred to as claim-check pattern: we split the message into a reference (“claim check”) and the related payload. We can then store the payload in an external storage and only need to pass references in our systems. For example, we may need to retrieve information about a user by referencing the userID. 

#### Goal
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture7_d.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture7.png">
  <img alt="Shows an original event which only contains a userID and a resulting event with additional attributes." src="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture7.png">
</picture>

#### Architecture Diagram
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture8_d.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture8.png">
  <img alt="Architecture diagram which connects an arbitrary source and target with a pipe that does enrichment, either using API Gateway, EventBridge, Step Functions or Lambda." src="https://raw.githubusercontent.com/aws-samples/amazon-eventbridge-pipes-architectural-patterns/main/images/Picture8.png">
</picture>

#### Try it out!
Step-by-step instructions to understand the implementation for the pattern:
1. Deploy the ClaimCheckStack
2. Check the "ClaimCheckTable" in Amazon DynamoDB
2. Trigger the ClaimCheckSampleDataCreatorLambda to generate a sample event.
3. Check the "ClaimCheckTable" again to see the event has been persistet in the database
4. Check the Amazon CloudWatch Log group '/aws/events/claimTargetLog' to see that only the claim check is passed to EventBridge
5. Check the ClaimCheckTargetWorkflow execution to see the enriched object in the target workflow.

**Note**: *“The sample code; software libraries; command line tools; proofs of concept; templates; or other related technology (including any of the foregoing that are provided by our personnel) is provided to you as AWS Content under the AWS Customer Agreement, or the relevant written agreement between you and AWS (whichever applies). You should not use this AWS Content in your production accounts, or on production or other critical data. You are responsible for testing, securing, and optimizing the AWS Content, such as sample code, as appropriate for production grade use based on your specific quality control practices and standards. Deploying AWS Content may incur AWS charges for creating or using AWS chargeable resources, such as running Amazon EC2 instances or using Amazon S3 storage.”*

## License

This library is licensed under the MIT-0 License. See the LICENSE file.