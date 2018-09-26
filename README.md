## Introduction

aws-serverless-developer-portal is a developer portal application that allows users to register, discover, and subscribe to your API Products (via API Gateway Usage Plans), manage their API Keys, and view their usage metrics for your APIs.

It also optionally supports subscription/unsubscription through a SaaS product offering through the AWS Marketplace.

![Alt text](/screen-home.png?raw=true)
![Alt text](/screen-apis.png?raw=true)
![Alt text](/screen-documentation.png?raw=true)

## Setup

### Prerequisites

First, ensure you have the [latest version of the SAM CLI installed](https://docs.aws.amazon.com/lambda/latest/dg/sam-cli-requirements.html). Clone this repo into a local directory.

Then, ensure that you have an S3 bucket to put zipped lambda functions into. It can be private, and will be referred to in this readme as "your-lambda-artifacts-bucket-name".

### Setup and deploy

Run:

```bash
sam package --template-file ./cloudformation/template.yaml --output-template-file packaged.yaml --s3-bucket your-lambda-artifacts-bucket-name
```

Followed by:

```bash
sam deploy --template-file ./packaged.yaml --stack-name "dev-portal" --capabilities CAPABILITY_NAMED_IAM --parameter-overrides DevPortalSiteS3BucketName="dev-portal-static-assets" ArtifactsS3BucketName="dev-portal-artifacts"
```

The command will exit when the stack creation is successful. If you'd like to watch it create in real-time, you can log into the cloudformation console.

You can override any of the parameters in the template using the `--parameter-overrides key="value"` format. This will be necessary if you intend to deploy several instances of the developer portal.

## Before going to production

You should [configure your domain name to point to your S3 website](http://docs.aws.amazon.com/AmazonS3/latest/dev/website-hosting-custom-domain-walkthrough.html) URL and enable SSL before officially launching your developer portal.

Additional Resources:

 - [Getting Started with Amazon CloudFront and AWS Certificate Manager](http://docs.aws.amazon.com/acm/latest/userguide/gs-cf.html)

 - [New – AWS Certificate Manager – Deploy SSL/TLS-Based Apps on AWS](https://aws.amazon.com/blogs/aws/new-aws-certificate-manager-deploy-ssltls-based-apps-on-aws/)

## Components

### SAM Stack (template.yaml)

Most components in the developer portal are managed by the SAM stack defined in template.yaml. New application components can be added to this template. Configuration values are fed to this template from the parameter overrides provided on the command line. If overrides are not provided, default values are used.

### UI (/app)

The UI is a simple React application hosted in a public S3 bucket. The client side code communicates with the application backend via an API Gateway proxy API. For more information on updating the UI, see `./dev-portal/README.md`.

### Application Backend (/lambdas/backend)

The application backend is a Lambda function built on the [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) library. The backend is responsible for login/registration, API subscription/unsubscription, usage metrics, and handling product subscription redirects from AWS Marketplace.

The backend function runs with escalated privileges (defined as LambdaExecutionRole in the CloudFormation template) and can be used to call other AWS services such as the API Gateway control plane or DynamoDB.

All resources in the API require AWS SigV4 authentication (i.e. via Cognito) with the exception of /register and the marketplace redirection resource.

By default, the backend implementation assumes a one-to-one association between authenticated users (Cognito identities) and API Gateway API Keys. A given user can be subscribed to multiple usage plans using the same API Key.

### AWS Marketplace SNS Listener Function (Optional) (/listener)

The listener Lambda function will be triggered when customers subscribe or unsubscribe to your product through the AWS Marketplace console. AWS Marketplace will generate a unique SNS Topic where events will be published for your product. This is configurable via 'marketplaceSubscriptionTopic' configuration in package.json. After changing this you will need to run 'npm run update-stack' and 'npm run subscribe-listener' to subscribe the listener function.

From the listener function you can manage your Usage Plan Keys through API Gateway to grant/revoke access to your APIs as well as implement any other subscription/unsubscription business logic. If you have multiple marketplace products, you will need to subscribe the listener function to the SNS topic for each product.

## Debugging

You can trace and troubleshoot the Lambda functions using CloudWatch Logs. See this [blog post](https://aws.amazon.com/blogs/compute/techniques-and-tools-for-better-serverless-api-logging-with-amazon-api-gateway-and-aws-lambda/) for more information.

## Marketplace SaaS Setup Instructions

**NOTE**: These instructions are now out of date!

You can sell your SaaS product through [AWS Marketplace] (https://aws.amazon.com/marketplace/management/tour/) and have the developer portal manage the subscription/unsubscription workflows. API Gateway will automatically provide authorization and metering for your product and subscribers will be automatically billed through AWS Marketplace.

Overview:

1) Create a Usage Plan in API Gateway

2) Create a SaaS Product in [AWS Marketplace] (https://aws.amazon.com/marketplace/management/tour/):

The redirect URL should be in the format:
https://YOUR_DEVELOPER_PORTAL_API_ID.execute-api.[REGION].amazonaws.com/prod/marketplace-confirm/[USAGE_PLAN_ID]

The product billing dimension name should be "apigateway" with description "Requests"

3) Update your Usage Plan with the AWS Marketplace Product Code via API Gateway "UpdateUsagePlan" API:

"aws apigateway update-usage-plan --usage-plan-id [USAGE_PLAN_ID] --patch-operations '[{ "path" : "/productCode", "value" : "[MARKETPLACE_PRODUCT_CODE]", "op" : "replace" }]'"

4) Update marketplaceSubscriptionTopic in package.json with the AWS Marketplace Product Code

5) Update CloudFormation stack via 'npm run update-stack'

6) Subscribe your listener function to your subscription topic via 'npm run subscribe-listener'

### Marketplace Flow

When buyers subscribe through the AWS Marketplace console, the buyers browser will send a POST request to /marketplace-confirm/[USAGE_PLAN_ID] in your backend API. By default, this redirects the request to the developer portal with the `usagePlanId` and `token` in the query string.

From here, the buyer is asked to login or register for the developer portal (or the existing session will be used). Once authenticated, a PUT request is made to /marketplace-subscriptions/[USAGE_PLAN_ID].

This operation makes a request to Marketplace Metering Service to resolve the buyer customer ID as well as the marketplace product code being subscribed to. By default, this operation simply associates the marketplace customer ID with the currently authenticated Cognito identity in DynamoDb for later use. It also calls API Gateway to get or create an API key for this user and associates this API Key with the marketplace customer ID.

At this point the API Key/buyer should not yet be authorized to use the product - the subscription is not technically complete until AWS Marketplace sends a 'subscribe-success' notification to the subscription SNS topic. This will trigger the listener Lambda function with a 'subscribe-success' or 'subscribe-fail' event. By default, on the 'subscribe-success' event, the listener function will lookup the Cognito identity ID associated with the Marketplace customer ID in DynamoDB. It will then call API Gateway to lookup or create an API Key associated with this Cognito identity ID. It will then subscribe this API Key to the Usage Plan associated with the AWS Marketplace Product Code.

At this point, the authenticated user (Cognito identity) is authorized to access your SaaS product. The authenticated user has an associated API Key in API Gateway and an associated marketplace customer ID tracked in DynamoDB. When the buyer makes requests to your product, their API Key will be authorized by API Gateway and they will be billed by AWS Marketplace according to your product configuration.

The unsubscription process is directly analogous to the subscription process - on 'unsubscribe-complete', the listener function will remove the API Key from the Usage Plan.
