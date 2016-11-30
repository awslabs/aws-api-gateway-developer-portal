## Introduction

aws-serverless-developer-portal is a reference implementation for a developer portal application that allows users to register, discover, and subscribe to your API Products (API Gateway Usage Plans), manage their API Keys, and view their usage metrics for your APIs.

It also optionally supports subscription/unsubscription through a SaaS product offering through the AWS Marketplace.

## Setup

### Prerequisites
First, ensure you have the [latest AWS CLI installed](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) (version >= 1.11.19) as well as [Node.js](https://nodejs.org/en/download/) 4+. Then, clone this repo into a local directory

### List your products (APIs/Usage Plans)
Add your API Gateway APIs to the array in the `lambdas/backend/catalog.json` file, using the following format. If you have not yet created an API and Usage Plan, see [blog post]() for a detailed walkthrough. Alternatively, skip this step for now if you just want to get started with your developer portal (A placeholder API with swagger definition is provided for you for demonstration purposes, however, some features such as __Subscribe__ will not work)

```json
{
	"apiId": "YOUR_API_ID",
	"usagePlanId": "YOUR_USAGE_PLAN_ID",
	"image": "http://example.com/your-api-product-image.svg",
	"swagger": {
  	"swagger": "2.0",
		...
	}
}
```

__TIP:__ If you put your api product images in the `dev-portal/public` directory, you can simply do `"image": "/your-api-product-image.svg"`. `image` is also optional.

Add your swagger definition to the `swagger` property to enable documentation for your API.

### Setup and deploy
Run:

```js
npm run setup
```

Follow the prompts and enter your account id, region, and names for your S3 buckets, CloudFormation stack, and API. The names you provide for the S3 buckets must be unique to that region (ie. not just unique to your account) so it is recommended to add a prefix or suffix (eg. my-org-dev-portal). You can choose to provide an existing bucket for the __artifacts__ S3 bucket name, or a new one (in which case it will be created for you). The __site__ S3 bucket must __NOT__ exist, as this is managed by the CloudFormation stack.

## Components

### Cloudformation Stack (cloudformation/base.json)

Most components in the developer portal are managed by the CloudFormation stack defined in cloudformation.json. New application components can be added to this template. Configuration values are fed to this template from the configuration properties in package.json.

To create/update the stack, run:

```js
npm run package-deploy
```

To delete the stack, run:

```js
npm run delete-stack
```

### UI (/app)

The UI is a simple React application hosted in a public S3 bucket. The client side code communicates with the application backend via an API Gateway proxy API. For more information on updating the UI, see `./dev-portal/README.md`.

### Application Backend (/lambdas/backend)

The application backend is a Lambda function built on the [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) library. The backend is responsible for login/registration, API subscription/unsubscription, usage metrics, and handling product subscription redirects from AWS Marketplace.

The backend function runs with escalated privileges (defined as LambdaExecutionRole in the CloudFormation template) and can be used to call other AWS services such as the API Gateway control plane or DynamoDB.

All resources in the API require AWS SigV4 authentication (i.e. via Cognito) with the exception of /register and the marketplace redirection resource.

By default, the backend implementation assumes a one-to-one association between authenticated users (Cognito identities) and API Gateway API Keys. A given user can be subscribed to multiple usage plans using the same API Key. However, the implementation can be changed to support multiple API Keys per user (for example, API Key per user per Usage Plan).

### AWS Marketplace SNS Listener Function (Optional) (/listener)

The listener Lambda function will be triggered when customers subscribe or unsubscribe to your product through the AWS Marketplace console. AWS Marketplace will generate a unique SNS Topic where events will be published for your product. This is configurable via 'marketplaceSubscriptionTopic' configuration in package.json. After changing this you will need to run 'npm run update-stack' and 'npm run subscribe-listener' to subscribe the listener function.

From the listener function you can manage your Usage Plan Keys through API Gateway to grant/revoke access to your APIs as well as implement any other subscription/unsubscription business logic. If you have multiple marketplace products, you will need to subscribe the listener function to the SNS topic for each product.

## Deploying Changes

Deploy changes to the application UI:

```js
npm run upload-site
```

Deploy changes to CloudFormation, Swagger, or lambda functions:

```js
npm run package-deploy
```

## Debugging

You can trace and troubleshoot the Lambda functions using CloudWatch Logs. See this [blog post](https://aws.amazon.com/blogs/compute/techniques-and-tools-for-better-serverless-api-logging-with-amazon-api-gateway-and-aws-lambda/) for more information.

## Marketplace SaaS Setup Instructions

You can sell your SaaS product through [AWS Marketplace] (https://aws.amazon.com/marketplace/management/tour/) and have the developer portal manage the subscription/unsubscription workflows. API Gateway will automatically provide authorization and metering for your product and subscribers will be automatically billed through AWS Marketplace.

Overview:

1) Create a Usage Plan in API Gateway
2) Create a SaaS Product in [AWS Marketplace] (https://aws.amazon.com/marketplace/management/tour/):

The redirect URL should be in the format:
https://YOUR_DEVELOPER_PORTAL_API_ID.execute-api.[REGION].amazonaws.com/prod/marketplace-confirm/[USAGE_PLAN_ID]

The product billing dimension name should be "apigateway" with description "Requests"

3) Update your Usage Plan with the AWS Marketplace Product Code via API Gateway "UpdateUsagePlan" API:

i.e. PATCH https://apigateway.[REGION].amazonaws.com/usageplans/[USAGE_PLAN_ID]
{
"patchOperations" :
[{
	"path" : "/productCode",
	"value" : "[MARKETPLACE_PRODUCT_CODE]",
	"op" : "replace"
}]
}

4) Update marketplaceSubscriptionTopic in package.json with the AWS Marketplace Product Code

5) Update CloudFormation stack via 'npm run update-stack'

6) Subscribe your listener function to your subscription topic via 'npm run subscribe-listener'

### Marketplace Flow ###

When buyers subscribe through the AWS Marketplace console, the buyers browser will send a POST request to /marketplace-confirm/[USAGE_PLAN_ID] in your backend API. By default, this operation simply redirects the buyer to marketplace-subscribe.html in the developer portal.

From here, the buyer is asked to login or register for the developer portal (or the existing session will be used). Once authenticated the buyer confirms the subscription and a PUT request is made to /marketplace-subscriptions/[USAGE_PLAN_ID].

This operation makes a request to Marketplace Metering Service to resolve the buyer customer ID as well as the marketplace product code being subscribed to. By default, this operation simply associates the marketplace customer ID with the currently authenticated Cognito identity in DynamoDb for later use. It also calls API Gateway to get or create an API key for this user and associates this API Key with the marketplace customer ID.

At this point the API Key/buyer should not yet be authorized to use the product - the subscription is not technically complete until AWS Marketplace sends a 'subscribe-success' notification to the subscription SNS topic. This will trigger the listener Lambda function with a 'subscribe-success' or 'subscribe-fail' event. By default, on the 'subscribe-success' event, the listener function will lookup the Cognito identity ID associated with the Marketplace customer ID in DynamoDB. It will then call API Gateway to lookup or create an API Key associated with this Cognito identity ID. It will then subscribe this API Key to the Usage Plan associated with the AWS Marketplace Product Code.

At this point, the authenticated user (Cognito identity) is authorized to access your SaaS product. The authenticated user has an associated API Key in API Gateway and an associated marketplace customer ID tracked in DynamoDB. When the buyer makes requests to your product, their API Key will be authorized by API Gateway and they will be billed by AWS Marketplace according to your product configuration.

The unsubscription process is directly analogous to the subscription process - on 'unsubscribe-complete', the listener function will remove the API Key from the Usage Plan.
