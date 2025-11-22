import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ControlPlane } from '@cdklabs/sbt-aws';
import * as path from 'path';

export interface ApiGatewayBackendProps {
  readonly userPool: cognito.UserPool;
  readonly identityPool: cognito.CfnIdentityPool;
  readonly customersTable: dynamodb.Table;
  readonly preLoginAccountsTable: dynamodb.Table;
  readonly feedbackTable: dynamodb.Table;
  readonly catalogBucket: s3.Bucket;
  readonly adminEmail: string;
  readonly registrationMode: string;
  readonly controlPlane?: ControlPlane;
  readonly enableMarketplace: boolean;
  readonly corsAllowedOrigins: string[];
}

export class ApiGatewayBackend extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly backendFunction: lambda.Function;
  public readonly catalogUpdaterFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiGatewayBackendProps) {
    super(scope, id);

    // Lambda Layer for common code
    const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/common-layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Common utilities and SBT integration',
    });

    // Main Backend Lambda Function
    this.backendFunction = new nodejs.NodejsFunction(this, 'BackendFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/backend/index.ts'),
      environment: {
        CUSTOMERS_TABLE: props.customersTable.tableName,
        PRE_LOGIN_ACCOUNTS_TABLE: props.preLoginAccountsTable.tableName,
        FEEDBACK_TABLE: props.feedbackTable.tableName,
        CATALOG_BUCKET: props.catalogBucket.bucketName,
        ADMIN_EMAIL: props.adminEmail,
        REGISTRATION_MODE: props.registrationMode,
        USER_POOL_ID: props.userPool.userPoolId,
        IDENTITY_POOL_ID: props.identityPool.ref,
        ENABLE_MARKETPLACE: props.enableMarketplace.toString(),
        SBT_CONTROL_PLANE_URL: props.controlPlane?.controlPlaneAPIEndpoint || '',
      },
      layers: [commonLayer],
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
    });

    // Grant permissions
    props.customersTable.grantReadWriteData(this.backendFunction);
    props.preLoginAccountsTable.grantReadWriteData(this.backendFunction);
    props.feedbackTable.grantReadWriteData(this.backendFunction);
    props.catalogBucket.grantReadWrite(this.backendFunction);

    // Grant API Gateway permissions
    this.backendFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'apigateway:GET',
          'apigateway:POST',
          'apigateway:PUT',
          'apigateway:DELETE',
        ],
        resources: ['*'],
      })
    );

    // Grant Cognito permissions
    this.backendFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminAddUserToGroup',
          'cognito-idp:AdminRemoveUserFromGroup',
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:ListUsers',
          'cognito-idp:ListUsersInGroup',
        ],
        resources: [props.userPool.userPoolArn],
      })
    );

    // If SBT Control Plane is provided, grant access
    if (props.controlPlane) {
      this.backendFunction.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['execute-api:Invoke'],
          resources: [`arn:aws:execute-api:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:*`],
        })
      );
    }

    // Catalog Updater Function
    this.catalogUpdaterFunction = new nodejs.NodejsFunction(this, 'CatalogUpdater', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/catalog-updater/index.ts'),
      environment: {
        CATALOG_BUCKET: props.catalogBucket.bucketName,
      },
      layers: [commonLayer],
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    });

    // API Gateway
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'Developer Portal API',
      description: 'API for Developer Portal backend',
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [
          ...props.corsAllowedOrigins,
          // Allow CloudFront origin (will be added dynamically)
        ],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'DeveloperPortalAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // Lambda Integration
    const lambdaIntegration = new apigateway.LambdaIntegration(this.backendFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

    // User APIs (require authentication)
    const signinResource = this.api.root.addResource('signin');
    signinResource.addMethod('POST', lambdaIntegration);

    const catalogResource = this.api.root.addResource('catalog');
    catalogResource.addMethod('GET', lambdaIntegration, { authorizer });

    const catalogItemResource = catalogResource.addResource('{id}');
    const sdkResource = catalogItemResource.addResource('sdk');
    sdkResource.addMethod('GET', lambdaIntegration, { authorizer });

    const exportResource = catalogItemResource.addResource('export');
    exportResource.addMethod('GET', lambdaIntegration, { authorizer });

    const apikeyResource = this.api.root.addResource('apikey');
    apikeyResource.addMethod('GET', lambdaIntegration, { authorizer });

    const subscriptionsResource = this.api.root.addResource('subscriptions');
    subscriptionsResource.addMethod('GET', lambdaIntegration, { authorizer });

    const subscriptionResource = subscriptionsResource.addResource('{usagePlanId}');
    subscriptionResource.addMethod('PUT', lambdaIntegration, { authorizer });
    subscriptionResource.addMethod('DELETE', lambdaIntegration, { authorizer });

    const usageResource = subscriptionResource.addResource('usage');
    usageResource.addMethod('GET', lambdaIntegration, { authorizer });

    const feedbackResource = this.api.root.addResource('feedback');
    feedbackResource.addMethod('GET', lambdaIntegration, { authorizer });
    feedbackResource.addMethod('POST', lambdaIntegration, { authorizer });

    // Admin APIs (require admin role)
    const adminResource = this.api.root.addResource('admin');

    const adminCatalogResource = adminResource.addResource('catalog');
    const visibilityResource = adminCatalogResource.addResource('visibility');
    visibilityResource.addMethod('GET', lambdaIntegration, { authorizer });
    visibilityResource.addMethod('POST', lambdaIntegration, { authorizer });

    const visibilityItemResource = visibilityResource.addResource('{id}');
    visibilityItemResource.addMethod('DELETE', lambdaIntegration, { authorizer });

    const genericResource = visibilityResource.addResource('generic').addResource('{genericId}');
    genericResource.addMethod('DELETE', lambdaIntegration, { authorizer });

    const adminCatalogItemResource = adminCatalogResource.addResource('{id}');
    const sdkGenerationResource = adminCatalogItemResource.addResource('sdkGeneration');
    sdkGenerationResource.addMethod('PUT', lambdaIntegration, { authorizer });
    sdkGenerationResource.addMethod('DELETE', lambdaIntegration, { authorizer });

    const accountsResource = adminResource.addResource('accounts');
    accountsResource.addMethod('GET', lambdaIntegration, { authorizer });
    accountsResource.addMethod('POST', lambdaIntegration, { authorizer });

    const accountResource = accountsResource.addResource('{userId}');
    accountResource.addMethod('DELETE', lambdaIntegration, { authorizer });

    const promoteResource = accountResource.addResource('promoteToAdmin');
    promoteResource.addMethod('PUT', lambdaIntegration, { authorizer });

    const resendInviteResource = accountsResource.addResource('resendInvite');
    resendInviteResource.addMethod('PUT', lambdaIntegration, { authorizer });

    // Marketplace APIs (if enabled)
    if (props.enableMarketplace && props.controlPlane) {
      const marketplaceConfirmResource = this.api.root
        .addResource('marketplace-confirm')
        .addResource('{usagePlanId}');
      marketplaceConfirmResource.addMethod('POST', lambdaIntegration);

      const marketplaceSubResource = this.api.root
        .addResource('marketplace-subscriptions')
        .addResource('{usagePlanId}');
      marketplaceSubResource.addMethod('PUT', lambdaIntegration, { authorizer });
    }
  }
}
