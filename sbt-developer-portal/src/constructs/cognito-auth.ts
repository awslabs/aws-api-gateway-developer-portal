import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface CognitoAuthProps {
  readonly adminEmail: string;
  readonly customersTable: dynamodb.Table;
  readonly preLoginAccountsTable: dynamodb.Table;
  readonly registrationMode: 'open' | 'invite' | 'request';
}

export class CognitoAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly adminGroup: cognito.CfnUserPoolGroup;
  public readonly registeredGroup: cognito.CfnUserPoolGroup;

  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    super(scope, id);

    // Pre-signup trigger Lambda
    const preSignupTrigger = new nodejs.NodejsFunction(this, 'PreSignupTrigger', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/cognito-triggers/pre-signup.ts'),
      environment: {
        REGISTRATION_MODE: props.registrationMode,
      },
      timeout: cdk.Duration.seconds(10),
    });

    // Post-confirmation trigger Lambda
    const postConfirmationTrigger = new nodejs.NodejsFunction(this, 'PostConfirmationTrigger', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/cognito-triggers/post-confirmation.ts'),
      environment: {
        CUSTOMERS_TABLE: props.customersTable.tableName,
        PRE_LOGIN_ACCOUNTS_TABLE: props.preLoginAccountsTable.tableName,
        REGISTRATION_MODE: props.registrationMode,
      },
      timeout: cdk.Duration.seconds(30),
    });

    props.customersTable.grantReadWriteData(postConfirmationTrigger);
    props.preLoginAccountsTable.grantReadWriteData(postConfirmationTrigger);

    // Post-authentication trigger Lambda
    const postAuthenticationTrigger = new nodejs.NodejsFunction(this, 'PostAuthenticationTrigger', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/cognito-triggers/post-authentication.ts'),
      timeout: cdk.Duration.seconds(10),
    });

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: props.registrationMode !== 'invite',
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      lambdaTriggers: {
        preSignUp: preSignupTrigger,
        postConfirmation: postConfirmationTrigger,
        postAuthentication: postAuthenticationTrigger,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Grant triggers permission to add users to groups
    postConfirmationTrigger.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminAddUserToGroup'],
        resources: [this.userPool.userPoolArn],
      })
    );

    // User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
      preventUserExistenceErrors: true,
    });

    // User Pool Groups
    this.adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Admins',
      description: 'Admin users with full access to developer portal management',
    });

    this.registeredGroup = new cognito.CfnUserPoolGroup(this, 'RegisteredGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Registered',
      description: 'Registered users with access to developer portal',
    });

    // Identity Pool
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // IAM Roles for Identity Pool
    const unauthenticatedRole = new iam.Role(this, 'UnauthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    const authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    const registeredRole = new iam.Role(this, 'RegisteredRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    const adminRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Attach roles to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        unauthenticated: unauthenticatedRole.roleArn,
        authenticated: authenticatedRole.roleArn,
      },
      roleMappings: {
        mapping: {
          type: 'Token',
          ambiguousRoleResolution: 'AuthenticatedRole',
          identityProvider: `${this.userPool.userPoolProviderName}:${this.userPoolClient.userPoolClientId}`,
        },
      },
    });
  }
}
