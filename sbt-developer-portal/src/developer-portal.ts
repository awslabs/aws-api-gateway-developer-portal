import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { ControlPlane } from '@cdklabs/sbt-aws';
import { ApiGatewayBackend } from './constructs/api-gateway-backend';
import { FrontendHosting } from './constructs/frontend-hosting';
import { CognitoAuth } from './constructs/cognito-auth';
import { ApiCatalog } from './constructs/api-catalog';

export interface DeveloperPortalProps {
  /**
   * The SBT Control Plane instance.
   * If not provided, API key management will be standalone.
   */
  readonly controlPlane?: ControlPlane;

  /**
   * Email address for admin notifications and initial admin user
   */
  readonly adminEmail: string;

  /**
   * Custom domain name for the developer portal (optional)
   */
  readonly customDomainName?: string;

  /**
   * ACM certificate ARN for custom domain (required if customDomainName is provided)
   */
  readonly certificateArn?: string;

  /**
   * Account registration mode: 'open' | 'invite' | 'request'
   * @default 'request'
   */
  readonly registrationMode?: 'open' | 'invite' | 'request';

  /**
   * Enable AWS Marketplace integration via SBT
   * @default false
   */
  readonly enableMarketplace?: boolean;

  /**
   * Additional CORS allowed origins for the API
   * @default []
   */
  readonly corsAllowedOrigins?: string[];
}

export class DeveloperPortal extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly customersTable: dynamodb.Table;
  public readonly apiUrl: string;
  public readonly websiteUrl: string;
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: DeveloperPortalProps) {
    super(scope, id);

    const registrationMode = props.registrationMode || 'request';

    // DynamoDB Tables
    this.customersTable = new dynamodb.Table(this, 'CustomersTable', {
      partitionKey: { name: 'Id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // GSI for marketplace integration
    this.customersTable.addGlobalSecondaryIndex({
      indexName: 'MarketplaceCustomerIdIndex',
      partitionKey: { name: 'MarketplaceCustomerId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const preLoginAccountsTable = new dynamodb.Table(this, 'PreLoginAccountsTable', {
      partitionKey: { name: 'UserId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const feedbackTable = new dynamodb.Table(this, 'FeedbackTable', {
      partitionKey: { name: 'Id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Cognito Authentication
    const auth = new CognitoAuth(this, 'Auth', {
      adminEmail: props.adminEmail,
      customersTable: this.customersTable,
      preLoginAccountsTable,
      registrationMode,
    });

    this.userPool = auth.userPool;
    this.identityPool = auth.identityPool;

    // API Catalog Management
    const catalog = new ApiCatalog(this, 'Catalog');

    // Backend API
    const backend = new ApiGatewayBackend(this, 'Backend', {
      userPool: this.userPool,
      identityPool: this.identityPool,
      customersTable: this.customersTable,
      preLoginAccountsTable,
      feedbackTable,
      catalogBucket: catalog.bucket,
      adminEmail: props.adminEmail,
      registrationMode,
      controlPlane: props.controlPlane,
      enableMarketplace: props.enableMarketplace || false,
      corsAllowedOrigins: props.corsAllowedOrigins || [],
    });

    this.apiUrl = backend.api.url;

    // Frontend Hosting
    const frontend = new FrontendHosting(this, 'Frontend', {
      apiUrl: backend.api.url,
      userPoolId: this.userPool.userPoolId,
      userPoolClientId: auth.userPoolClient.userPoolClientId,
      identityPoolId: this.identityPool.ref,
      region: cdk.Stack.of(this).region,
      customDomainName: props.customDomainName,
      certificateArn: props.certificateArn,
    });

    this.websiteUrl = frontend.websiteUrl;
    this.distributionDomainName = frontend.distributionDomainName;

    // Grant catalog updater access
    catalog.bucket.grantReadWrite(backend.catalogUpdaterFunction);

    // Outputs
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: this.websiteUrl,
      description: 'Developer Portal Website URL',
    });

    new cdk.CfnOutput(this, 'ApiURL', {
      value: this.apiUrl,
      description: 'Developer Portal API URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID',
    });

    if (props.controlPlane) {
      new cdk.CfnOutput(this, 'SBTIntegration', {
        value: 'Enabled',
        description: 'SBT Control Plane integration is enabled',
      });
    }
  }
}
