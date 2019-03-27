## Introduction
[![Build Status](https://travis-ci.org/awslabs/aws-api-gateway-developer-portal.svg?branch=master)](https://travis-ci.org/awslabs/aws-api-gateway-developer-portal)

The Amazon API Gateway Serverless Developer Portal is an application that you use for developer engagement by making your API Gateway APIs available to your customers through self-service discovery of those APIs. Your customers can use the developer portal to browse API documentation, register for – and immediately receive – their own API key that can be used to build applications, test published APIs, monitor their own API usage, generate SDKs, and submit feedback on your APIs design.

For more information about Amazon API Gateway, visit the API Gateway [product page](https://aws.amazon.com/api-gateway/).

It also optionally supports subscription/unsubscription through a SaaS product offering through the AWS Marketplace.

![Alt text](/screen-home.png?raw=true)
![Alt text](/screen-documentation.png?raw=true)

## Setup
There are 2 main ways to deploy the Developer Portal today:
### 1. Deploy with SAR
This deployment model is better if you want an easy way to deploy the developer portal and use it as-is out of box. You can deploy the Serverless Developer Portal through SAR in a few clicks! See the [documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-developer-portal.html).

### 2. Deploy with SAM
This deployment model is better if you plan to customize the developer portal heavily and setup CI/CD on it.
#### Prerequisites

First, ensure you have the [latest version of the SAM CLI installed](https://docs.aws.amazon.com/lambda/latest/dg/sam-cli-requirements.html). Note that while the instructions specify Docker as a pre-requisite, Docker is only necessary for local development via SAM local. Feel free to skip installing Docker when you first set up the developer portal.

Then, clone this repo into a local directory. Ensure that you have an S3 bucket to put zipped lambda functions into. It can be private, and will be referred to in this readme as "your-lambda-artifacts-bucket-name".

If you have not used the AWS CLI or SAM CLI before, you may need to [configure your AWS credentials file](https://docs.aws.amazon.com/cli/latest/userguide/cli-config-files.html).

If you have previously set up a v1 developer portal (non-SAM deployed), you will need to either remove all the v1 developer portal resources (dynamo tables, roles, etc.) or provide new names for the v2 developer portal by passing in parameter overrides for every resource.

#### Deploy

Run:
>In the command below, replace the `your-lambda-artifacts-bucket-name` with the name of a bucket that you manage and that already exists. Then, run:
```bash
sam package --template-file ./cloudformation/template.yaml --output-template-file ./cloudformation/packaged.yaml --s3-bucket your-lambda-artifacts-bucket-name
```

Then run: 
>In the command below, replace the `your-lambda-artifacts-bucket-name` with the name of a bucket that you manage and that already exists, and replace `custom-prefix` with some prefix that is globally unique, like your org name or username. Then, run:
```bash
sam deploy --template-file ./cloudformation/packaged.yaml --stack-name "dev-portal" --s3-bucket your-lambda-artifacts-bucket-name --capabilities CAPABILITY_NAMED_IAM --parameter-overrides DevPortalSiteS3BucketName="custom-prefix-dev-portal-static-assets" ArtifactsS3BucketName="custom-prefix-dev-portal-artifacts" CognitoDomainNameOrPrefix="custom-prefix"
```

The command will exit when the stack creation is successful. If you'd like to watch it create in real-time, you can log into the cloudformation console.

To get the URL for the newly created developer portal instance, find the websiteURL field in the cloudformation console's outputs or run this command:

```bash
aws cloudformation describe-stacks --query "Stacks[?StackName=='dev-portal'][Outputs[?OutputKey=='WebsiteURL']][][].OutputValue"
```

You can override any of the parameters in the template using the `--parameter-overrides key="value"` format. This will be necessary if you intend to deploy several instances of the developer portal or customize some of the features. You can see a full list of overridable parameters in `cloudformation/template.yaml` under the `Parameters` section.

## Registering Users
Users can self-register by clicking the 'Register' button in the developer portal. Cognito calls the `CognitoUserPoolsConfirmationStrategyFunction` to determine if the user is allowed to register themselves. By default, this function always accepts the user into the user pool, but you can customize the body of the function either in a local repository (followed by packaging and deploying) or in the lambda console. If you intend for the developer portal to be 'private' to some group of users (and not globally / freely accessible), you will need to write a lambda function that enforces your business logic for user registration. Documentation on this lambda function's use can be found [here](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html).

### Promoting a User to an Admin
Admin users can manage what APIs are visible to normal users and whether or not SDK generation is enabled (per api) for normal users. To promote a user to an admin, go to the Cognito console in the account the developer portal is in, select User Pools, then select the correct User Pool for the dev portal. From there, choose Users and groups, click on the users' name, choose Add to group, and select the group named `STACK-NAMEAdminsGroup`. This user is now an admin; if they're currently logged in, they will have to log out and back in to receive admin credentials.

## Populate the API catalog
By default the Developer Portal won't list any APIs. You will have to pick and choose which APIs to show. There are 2 types of APIs:

### Subscribable APIs
For an API to be subscribable, they must be managed by Amazon API Gateway. The Developer Portal can let a user associate their API Key with these APIs (via the Subscribe button) so they can start calling and developing on these APIs.

To list a subscribable API:
1. In API Gateway's console or CLI, associate that API & stage to a usage plan.
2. Log into the developer portal using an admin account and go to the Admin Panel tab.
3. In the "Displayed" column, click "False".

### Non-subscribable APIs
The Developer can also list APIs that are managed outside of Amazon API Gateway (e.g., APIs hosted on-premise). The Developer Portal won't be able to associate an API Key with the API automatically; however, customers can still test the APIs.

To list a non-subscribable API:
1. Log into the developer portal using an admin account and go to the Admin Panel tab.
2. In the "Generic APIs" table, click "Add API", select an API specification file (Swagger or OAS3 in .json, .yaml, or .yml), and upload it.

### Testing your APIs

When logged into the developer portal with an account that has a provisioned api key, you should be able to test your APIs by selecting a resource/method in them and clicking "Try it out!". Note that this requires CORS to be set up on your API to allow the developer portal to call it. Note that the default PetStore has CORS enabled on all resources but `/`.

## Before going to production
### Setup a custom domain for your Developer Portal
You should [request and verify an ACM managed certificate for your custom domain name.](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) Then, redeploy the CFN stack with the domain name and ACM cert ARN as parameter overrides. Additionally, you can control if Route 53 nameservers are created using the `UseRoute53Nameservers` override. A value of true will result in the creation of a Route 53 hosted zone and record set; false will skip the creation of these resources.

```bash
sam deploy --template-file ./cloudformation/packaged.yaml --stack-name "dev-portal" --capabilities CAPABILITY_NAMED_IAM --parameter-overrides DevPortalSiteS3BucketName="custom-prefix-dev-portal-static-assets" ArtifactsS3BucketName="custom-prefix-dev-portal-artifacts" CustomDomainName="my.acm.managed.domain.name.com" CustomDomainNameAcmCertArn="arn:aws:acm:us-east-1:111111111111:certificate/12345678-1234-1234-1234-1234567890ab" UseRoute53Nameservers="false"
```

This creates a cloudfront distribution in front of the S3 bucket serving the site, optionally sets up a Route53 hosted zone with records aliased to that distribution, and require HTTPS to communicate with the cloudfront distribution.

If you chose `UseRoute53Nameservers=true`, after the deployment finishes, go to the Route53 console, find the nameservers for the hosted zone created by the deployment, and add those as the nameservers for your domain name through your registrar. The specifics of this process will vary by registrar.

If you chose `UseRoute53Nameservers=false`, instead point your nameservers at the cloudfront distribution's URL.

### Add custom content and brand the Developer Portal
See [this page on customization](https://github.com/awslabs/aws-api-gateway-developer-portal/wiki/Customization)

## Updating to a new version
The Developer Portal follows the semantic versioning scheme (major.minor.patch). Changes to the minor or patch version are backwards compatible so you should feel safe to get the latest version. For changes to major versions, please see [this page on updating](https://github.com/awslabs/aws-api-gateway-developer-portal/wiki/Upgrading/_edit).

### To update a SAM deployment:
1. Get the latest version from GitHub (Clone/Pull/Download).
2. When deploying follow the same steps as previous and use the same values for the parameters. The only difference is passing in a new value for the stack parameter StaticAssetRebuildToken. You can use any string for this as long as it is different than previously used.

### To update a SAR deployment
1. When deploying follow the same steps as previous and use the same values for the parameters. The only difference is passing in a new value for the stack parameter StaticAssetRebuildToken.

## Components
For an overview of the components of the developer portal, please see [this page](https://github.com/awslabs/aws-api-gateway-developer-portal/wiki/Components).

## Debugging

You can trace and troubleshoot the Lambda functions using CloudWatch Logs. See [this blog post](https://aws.amazon.com/blogs/compute/techniques-and-tools-for-better-serverless-api-logging-with-amazon-api-gateway-and-aws-lambda/) for more information.

## Tear-down

Deleting the developer portal should be as easy as deleting the cloudformation stack. This will empty the `ArtifactsS3Bucket` and `DevPortalSiteS3Bucket` s3 buckets, including any custom files! Note that this will not delete any api keys provisioned by the developer portal. If you would like to delete api keys provisioned through the developer portal but not those provisioned through other means, make sure to download a backup of the `Customers` DDB table before deleting the cloudformation stack. This table lists the provisioned api keys that will need to be cleaned up afterwards.

## Marketplace SaaS Setup Instructions

**NOTE**: These instructions are now out of date!

You can sell your SaaS product through [AWS Marketplace](https://aws.amazon.com/marketplace/management/tour/) and have the developer portal manage the subscription/unsubscription workflows. API Gateway will automatically provide authorization and metering for your product and subscribers will be automatically billed through AWS Marketplace.

Overview:

1) Create a Usage Plan in API Gateway

2) Create a SaaS Product in [AWS Marketplace](https://aws.amazon.com/marketplace/management/tour/):

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
