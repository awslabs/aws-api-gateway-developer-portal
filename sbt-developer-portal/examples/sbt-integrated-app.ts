#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ControlPlane } from '@cdklabs/sbt-aws';
import { DeveloperPortal } from '../src';

/**
 * Advanced example: Developer Portal with SBT Integration
 *
 * This example demonstrates:
 * - SBT Control Plane integration
 * - AWS Marketplace support
 * - Custom domain configuration
 * - Multi-tenant architecture
 */
class SBTIntegratedStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create SBT Control Plane
    const controlPlane = new ControlPlane(this, 'ControlPlane', {
      systemAdminEmail: 'admin@example.com',
    });

    // 2. Create Developer Portal with SBT integration
    const portal = new DeveloperPortal(this, 'DevPortal', {
      // Basic configuration
      adminEmail: 'admin@example.com',
      registrationMode: 'request', // Users request access, admin approves

      // SBT Integration
      controlPlane: controlPlane,
      enableMarketplace: true,

      // Custom domain (optional)
      // customDomainName: 'developers.example.com',
      // certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/...',

      // CORS configuration
      corsAllowedOrigins: [
        'https://example.com',
        'https://app.example.com',
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'PortalURL', {
      value: portal.websiteUrl,
      description: 'Developer Portal URL',
      exportName: 'DeveloperPortalURL',
    });

    new cdk.CfnOutput(this, 'ApiURL', {
      value: portal.apiUrl,
      description: 'Backend API URL',
      exportName: 'DeveloperPortalAPIURL',
    });

    new cdk.CfnOutput(this, 'SBTControlPlaneEndpoint', {
      value: controlPlane.controlPlaneAPIEndpoint,
      description: 'SBT Control Plane API Endpoint',
      exportName: 'SBTControlPlaneEndpoint',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: portal.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'DevPortalUserPoolId',
    });

    new cdk.CfnOutput(this, 'CustomersTableName', {
      value: portal.customersTable.tableName,
      description: 'Customers DynamoDB Table',
      exportName: 'DevPortalCustomersTable',
    });
  }
}

const app = new cdk.App();

new SBTIntegratedStack(app, 'SBTDevPortalStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'SBT-integrated Developer Portal for API as a Service',
  tags: {
    Project: 'DeveloperPortal',
    Environment: 'Production',
    ManagedBy: 'CDK',
  },
});

app.synth();
