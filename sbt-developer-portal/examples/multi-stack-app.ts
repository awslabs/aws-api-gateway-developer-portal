#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { ControlPlane } from '@cdklabs/sbt-aws';
import { DeveloperPortal } from '../src';

/**
 * Multi-stack example: Separate API stack and Developer Portal stack
 *
 * This demonstrates how to integrate the Developer Portal with existing APIs
 */

// Stack 1: Your existing API
class YourApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly usagePlan: apigateway.UsagePlan;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Your existing Lambda function
    const handler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Hello from API!' }),
          };
        };
      `),
      handler: 'index.handler',
    });

    // Your API Gateway
    this.api = new apigateway.RestApi(this, 'MyApi', {
      restApiName: 'My Awesome API',
      description: 'Production API for customers',
    });

    const integration = new apigateway.LambdaIntegration(handler);
    this.api.root.addResource('hello').addMethod('GET', integration, {
      apiKeyRequired: true,
    });

    // Create usage plan for your API
    this.usagePlan = this.api.addUsagePlan('StandardPlan', {
      name: 'Standard Plan',
      description: 'Standard tier with rate limiting',
      throttle: {
        rateLimit: 10,
        burstLimit: 20,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.MONTH,
      },
    });

    this.usagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // Export API ID for Developer Portal
    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      exportName: 'MyApiId',
    });

    new cdk.CfnOutput(this, 'UsagePlanId', {
      value: this.usagePlan.usagePlanId,
      exportName: 'MyApiUsagePlanId',
    });
  }
}

// Stack 2: Developer Portal
class DevPortalStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create SBT Control Plane
    const controlPlane = new ControlPlane(this, 'ControlPlane', {
      systemAdminEmail: 'admin@example.com',
    });

    // Create Developer Portal
    const portal = new DeveloperPortal(this, 'DevPortal', {
      adminEmail: 'admin@example.com',
      controlPlane: controlPlane,
      registrationMode: 'request',
      enableMarketplace: true,
    });

    // Import API from other stack
    const apiId = cdk.Fn.importValue('MyApiId');
    const usagePlanId = cdk.Fn.importValue('MyApiUsagePlanId');

    new cdk.CfnOutput(this, 'Instructions', {
      value: `
To make your API visible in the portal:
1. Log in to the portal as admin
2. Go to Admin Panel > API Catalog
3. Add API with ID: ${apiId}
4. Usage Plan ID: ${usagePlanId}

Or use AWS CLI:
aws apigateway get-rest-api --rest-api-id ${apiId}
      `.trim(),
    });

    new cdk.CfnOutput(this, 'PortalURL', {
      value: portal.websiteUrl,
    });
  }
}

// Deploy
const app = new cdk.App();

const apiStack = new YourApiStack(app, 'YourApiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const portalStack = new DevPortalStack(app, 'DevPortalStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Portal depends on API stack exports
portalStack.addDependency(apiStack);

app.synth();
