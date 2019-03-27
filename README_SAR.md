### Introduction
The Serverless Developer Portal is an application that you use for developer engagement by making your API Gateway APIs available to your customers through self-service discovery of those APIs. Your customers can use the developer portal to browse API documentation, register for – and immediately receive – their own API key that can be used to build applications, test published APIs, and monitor their own API usage.
![Alt text](https://raw.githubusercontent.com/awslabs/aws-api-gateway-developer-portal/staging/screen-home.png)

### How to use:
#### To deploy
1. Enter a name for ArtifactsS3BucketName: this will create an Amazon S3 bucket with that name for storing the catalog metadata.
1. Enter a name for DevPortalSiteS3BucketName: this will create an Amazon S3 bucket with that name for the web application code.
1. Enter a unique prefix for CognitoDomainNameOrPrefix; this will be used in the sign in page's URL.
1. You should leave all the other settings as-is unless you need to change them. For example, you can optionally enter a custom domain name in the CustomDomainName field.
1. Acknowledge that the app uses custom roles by checking the box "I acknowledge that this app creates custom IAM roles."
1. Choose Deploy.

#### Viewing the portal
1. Click the link for "View in CloudFormation" or open the AWS CloudFormation management console directly.
1. Choose the name of the stack (aws-serverless-repository-api-gateway-dev-portal is the default stack name).
1. Open the Outputs section. The URL for the developer portal is specified in the WebSiteURL property.

#### Updating to a new version
The Developer Portal follows the semantic versioning scheme (major.minor.patch). Changes to the minor or patch version are backwards compatible so you should feel safe to get the latest version. For changes to major versions, please see [this page on updating](https://github.com/awslabs/aws-api-gateway-developer-portal/wiki/Upgrading/_edit).

To update:
1. When deploying follow the same steps as previous and use the same values for the parameters. The only difference is passing in a new value for the stack parameter StaticAssetRebuildToken. You can use any string for this as long as it is different than the previously used string.

#### Next steps
1. Publish an API on it for your customer to look at. Learn how to do that [here](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-developer-portal.html#apigateway-developer-portal-publish).
1. Customize, own, and brand the portal. Learn how to do that [here](https://github.com/awslabs/aws-api-gateway-developer-portal/wiki/Customization).
1. Setup a custom domain on it your customers recognize your brand and the associated APIs. Learn how to do that [here](https://github.com/awslabs/aws-api-gateway-developer-portal#before-going-to-production).

To learn more about the API Gateway Serverless Developer Portal, read the [documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-developer-portal.html) or visit the [GitHub repository](https://github.com/awslabs/aws-api-gateway-developer-portal). For more information about Amazon API Gateway, visit the API Gateway [product page](https://aws.amazon.com/api-gateway/).
