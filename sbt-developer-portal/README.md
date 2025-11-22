# SBT Developer Portal

AWS CDK Construct for building a fully-featured API Developer Portal with AWS SaaS Builder Toolkit (SBT) integration.

## Overview

This construct provides a complete, production-ready Developer Portal for your APIs with:

- 🎨 **Modern React Frontend** (React 18 + TypeScript + Vite)
- 🔐 **Cognito Authentication** (User Pool + Identity Pool)
- 🔑 **Automatic API Key Management**
- 📊 **Usage Analytics Dashboard** (Chart.js)
- 📚 **Interactive API Documentation** (Swagger UI)
- 💾 **SDK Generation** (JavaScript, Java, Python, Ruby, Android, iOS)
- 🌐 **CDN Distribution** (CloudFront + S3)
- 🔧 **AWS Marketplace Integration** (via SBT)
- 🏢 **Multi-tenant Support** (SBT Control Plane)
- ⚡ **Serverless Backend** (API Gateway + Lambda)

## Features Comparison

| Feature | Original Project | This Construct |
|---------|-----------------|----------------|
| Runtime | Node.js 16 (EOL) | Node.js 20 ✅ |
| Infrastructure | SAM (YAML) | AWS CDK (TypeScript) ✅ |
| Frontend | React 16 | React 18 ✅ |
| SBT Integration | ❌ | ✅ |
| Marketplace | ❌ Broken | ✅ Working |
| Type Safety | ❌ | ✅ TypeScript |
| Modern Build | CRA | Vite ✅ |

## Installation

```bash
npm install @aws-samples/sbt-developer-portal
```

## Quick Start

### Basic Usage (Standalone)

```typescript
import * as cdk from 'aws-cdk-lib';
import { DeveloperPortal } from '@aws-samples/sbt-developer-portal';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'DeveloperPortalStack');

const portal = new DeveloperPortal(stack, 'MyDevPortal', {
  adminEmail: 'admin@example.com',
  registrationMode: 'open', // 'open' | 'invite' | 'request'
});

console.log('Portal URL:', portal.websiteUrl);
console.log('API URL:', portal.apiUrl);
```

### With AWS SBT Integration

```typescript
import * as cdk from 'aws-cdk-lib';
import { ControlPlane } from '@cdklabs/sbt-aws';
import { DeveloperPortal } from '@aws-samples/sbt-developer-portal';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'SaaSStack');

// Create SBT Control Plane
const controlPlane = new ControlPlane(stack, 'ControlPlane', {
  systemAdminEmail: 'admin@example.com',
});

// Create Developer Portal with SBT integration
const portal = new DeveloperPortal(stack, 'DevPortal', {
  adminEmail: 'admin@example.com',
  controlPlane: controlPlane,
  enableMarketplace: true,
  registrationMode: 'request',
});

// Output important URLs
new cdk.CfnOutput(stack, 'PortalURL', {
  value: portal.websiteUrl,
});

new cdk.CfnOutput(stack, 'SBTControlPlaneURL', {
  value: controlPlane.controlPlaneAPIEndpoint,
});
```

### With Custom Domain

```typescript
const portal = new DeveloperPortal(stack, 'DevPortal', {
  adminEmail: 'admin@example.com',
  customDomainName: 'developers.example.com',
  certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/...',
});
```

### Advanced Configuration

```typescript
const portal = new DeveloperPortal(stack, 'DevPortal', {
  adminEmail: 'admin@example.com',

  // SBT Integration
  controlPlane: controlPlane,
  enableMarketplace: true,

  // Registration Mode
  registrationMode: 'request', // Users must request access

  // Custom Domain
  customDomainName: 'developers.example.com',
  certificateArn: certificateArn,

  // CORS Configuration
  corsAllowedOrigins: [
    'https://example.com',
    'https://app.example.com',
  ],
});

// Access resources
const userPool = portal.userPool;
const customersTable = portal.customersTable;
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CloudFront CDN                          │
│                  (developers.example.com)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    S3 Static Hosting                        │
│              (React 18 + TypeScript + Vite)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Swagger UI (API Docs)                              │  │
│  │ • API Key Display                                    │  │
│  │ • Usage Dashboard (Chart.js)                         │  │
│  │ • SDK Generator                                      │  │
│  │ • Admin Panel                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (REST API)                     │
│                  (Cognito Authorizer)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Lambda Functions (Node.js 20)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • API Key Management                                 │  │
│  │ • Subscription Management                            │  │
│  │ • Usage Analytics                                    │  │
│  │ • SDK Generation                                     │  │
│  │ • SBT Integration Client                             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────┬────────────────┬────────────────┬─────────────────┘
         │                │                │
         ▼                ▼                ▼
┌────────────────┐  ┌──────────┐  ┌──────────────────┐
│   DynamoDB     │  │ Cognito  │  │  SBT Control     │
│   Tables       │  │  User    │  │     Plane        │
│ • Customers    │  │  Pool    │  │  (Optional)      │
│ • Feedback     │  └──────────┘  └──────────────────┘
└────────────────┘
```

## Key Features

### 1. Automatic API Key Management

Users automatically receive API keys upon registration:

```typescript
// Backend automatically:
// 1. Creates API key on user confirmation
// 2. Associates with Cognito Identity
// 3. Registers with SBT (if enabled)
// 4. Displays in dashboard
```

### 2. Self-Service Subscription

Users can subscribe/unsubscribe to API usage plans:

```typescript
// PUT /subscriptions/{usagePlanId}
// Automatically:
// - Creates API key if needed
// - Associates with usage plan
// - Notifies SBT Control Plane
// - Updates DynamoDB
```

### 3. Usage Analytics

Real-time usage tracking with beautiful charts:

```typescript
// Frontend component
<UsageDashboard
  usagePlanId="abc123"
  apiName="My API"
/>
```

### 4. SDK Generation

One-click SDK download for multiple languages:

- JavaScript
- Java (Maven/Gradle)
- Python
- Ruby
- Android
- iOS (Swift/Objective-C)

### 5. SBT Integration

Seamless integration with SaaS Builder Toolkit:

```typescript
// Automatic tenant registration
await sbtClient.registerTenant({
  tenantId: cognitoIdentityId,
  tenantName: userEmail,
  email: userEmail,
  tier: 'free',
});

// Usage tracking
await sbtClient.recordUsage(
  cognitoIdentityId,
  usagePlanId,
  requestCount
);

// Marketplace integration
await sbtClient.notifySubscription(
  cognitoIdentityId,
  usagePlanId,
  'subscribe'
);
```

## Registration Modes

### Open Registration

Anyone can sign up:

```typescript
registrationMode: 'open'
```

### Invite-Only

Admin must create users:

```typescript
registrationMode: 'invite'
```

### Request Access

Users request, admin approves:

```typescript
registrationMode: 'request'
```

## Admin Features

Promote users to admin via Cognito console or CLI:

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_xxxxx \
  --username user@example.com \
  --group-name Admins
```

Admin users can:
- Manage API visibility
- Enable/disable SDK generation
- Invite users
- Promote users to admin

## Deployment

```bash
# Install dependencies
npm install

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Build CDK construct
npm run build

# Deploy
cdk deploy
```

## Environment Variables

Backend Lambda functions use:

| Variable | Description |
|----------|-------------|
| `CUSTOMERS_TABLE` | DynamoDB customers table |
| `PRE_LOGIN_ACCOUNTS_TABLE` | Pre-registration table |
| `FEEDBACK_TABLE` | Feedback submissions |
| `CATALOG_BUCKET` | S3 bucket for API specs |
| `USER_POOL_ID` | Cognito User Pool ID |
| `IDENTITY_POOL_ID` | Cognito Identity Pool ID |
| `REGISTRATION_MODE` | open/invite/request |
| `SBT_CONTROL_PLANE_URL` | SBT Control Plane endpoint |
| `ENABLE_MARKETPLACE` | Enable AWS Marketplace |

## Frontend Configuration

Runtime config loaded from `/config.json`:

```json
{
  "region": "us-east-1",
  "apiUrl": "https://api.execute-api...",
  "userPoolId": "us-east-1_xxxxx",
  "userPoolClientId": "xxxxx",
  "identityPoolId": "us-east-1:xxxxx"
}
```

## API Endpoints

### User APIs

- `GET /catalog` - List available APIs
- `GET /catalog/{id}/sdk` - Download SDK
- `GET /catalog/{id}/export` - Export API spec
- `GET /apikey` - Get user's API key
- `GET /subscriptions` - List subscriptions
- `PUT /subscriptions/{usagePlanId}` - Subscribe
- `DELETE /subscriptions/{usagePlanId}` - Unsubscribe
- `GET /subscriptions/{usagePlanId}/usage` - Get usage stats
- `POST /feedback` - Submit feedback

### Admin APIs

- `GET /admin/catalog/visibility` - List API visibility
- `POST /admin/catalog/visibility` - Update visibility
- `DELETE /admin/catalog/visibility/{id}` - Remove API
- `PUT /admin/catalog/{id}/sdkGeneration` - Enable SDK
- `GET /admin/accounts` - List users
- `POST /admin/accounts` - Invite user
- `DELETE /admin/accounts/{userId}` - Delete user
- `PUT /admin/accounts/{userId}/promoteToAdmin` - Promote

## Benefits Over Original Project

✅ **Modern Stack**: Node.js 20, React 18, TypeScript
✅ **Type Safety**: Full TypeScript coverage
✅ **SBT Integration**: Native SaaS toolkit support
✅ **Marketplace**: Working AWS Marketplace integration
✅ **CDK**: Infrastructure as TypeScript code
✅ **Maintainable**: Active development, not EOL
✅ **Performance**: Vite build, optimized bundles
✅ **Security**: Latest dependencies, no vulnerabilities

## License

Apache-2.0

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues and questions:
- GitHub Issues: https://github.com/aws-samples/sbt-developer-portal
- AWS SBT Docs: https://github.com/awslabs/sbt-aws
