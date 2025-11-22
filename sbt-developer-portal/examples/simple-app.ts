#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DeveloperPortal } from '../src';

/**
 * Simple example: Standalone Developer Portal without SBT
 */
class SimpleDevPortalStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const portal = new DeveloperPortal(this, 'DevPortal', {
      adminEmail: 'admin@example.com',
      registrationMode: 'open',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: portal.websiteUrl,
      description: 'Developer Portal URL',
    });

    new cdk.CfnOutput(this, 'ApiURL', {
      value: portal.apiUrl,
      description: 'Backend API URL',
    });
  }
}

const app = new cdk.App();
new SimpleDevPortalStack(app, 'SimpleDevPortalStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
