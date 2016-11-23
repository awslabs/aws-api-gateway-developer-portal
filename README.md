## INTERNAL/NDA ONLY - DO NOT DISTRIBUTE


## Introduction

aws-serverless-developer-portal is a reference implementation for a developer portal application that allows users to register, discover, and subscribe to your API Products (API Gateway Usage Plans), manage their API Keys, and view their usage metrics for your APIs.

It also optionally supports subscription/unsubscription through a SaaS product offering through the AWS Marketplace.

## Setup
```js
npm install
npm run pre-config
npm run setup
npm run post-setup
```

Enter your new API Id, Dev Portal Function Name, Cognito User Pool ID, Cognito Client ID, and Cognito Identity Pool ID, available in Cloudformation __Outputs__. Click the WebsiteURL in the __Outputs__ section of your CloudFormation stack.

Update backend/catalog.json with your API Gateway Usage Plans (if you do not yet have one, you will need to create it).

## Components

### Cloudformation Stack (cloudformation.json)

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

The UI is a simple React application hosted in a public S3 bucket. The client side code communicates with the application backend via an API Gateway proxy API.

### Application Backend (/lambdas/express)

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

Deploy changes to CloudFormation, Swagger, backend function, and the listener function:

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
