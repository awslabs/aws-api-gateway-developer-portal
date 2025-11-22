# Project Structure

```
sbt-developer-portal/
├── package.json                    # NPM package configuration
├── tsconfig.json                   # TypeScript configuration
├── README.md                       # Main documentation
├── PROJECT_STRUCTURE.md           # This file
│
├── src/                           # CDK Construct source code
│   ├── index.ts                   # Main exports
│   ├── developer-portal.ts        # Main DeveloperPortal construct
│   │
│   ├── constructs/                # Sub-constructs
│   │   ├── api-gateway-backend.ts    # API Gateway + Lambda backend
│   │   ├── frontend-hosting.ts       # S3 + CloudFront hosting
│   │   ├── cognito-auth.ts          # Cognito authentication
│   │   └── api-catalog.ts           # API catalog management
│   │
│   └── lambda/                    # Lambda function code
│       ├── backend/               # Main backend API
│       │   ├── index.ts              # Express app entry point
│       │   ├── routes/
│       │   │   ├── apikey.ts         # API key endpoints
│       │   │   ├── subscriptions.ts  # Subscription management
│       │   │   ├── catalog.ts        # API catalog endpoints
│       │   │   ├── feedback.ts       # User feedback
│       │   │   └── admin.ts          # Admin endpoints
│       │   └── lib/
│       │       ├── customers-controller.ts  # Customer/API key logic
│       │       ├── sbt-integration.ts       # SBT Control Plane client
│       │       └── utils.ts                 # Helper functions
│       │
│       ├── catalog-updater/       # S3 event handler for API specs
│       │   └── index.ts
│       │
│       ├── cognito-triggers/      # Cognito Lambda triggers
│       │   ├── pre-signup.ts
│       │   ├── post-confirmation.ts
│       │   └── post-authentication.ts
│       │
│       └── common-layer/          # Shared Lambda layer
│           └── nodejs/
│               └── node_modules/
│
├── frontend/                      # React frontend application
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts            # Vite build configuration
│   │
│   └── src/
│       ├── main.tsx              # Application entry point
│       ├── App.tsx               # Root component
│       ├── index.css             # Global styles
│       │
│       ├── components/           # React components
│       │   ├── Layout.tsx           # Main layout wrapper
│       │   ├── APIKeyDisplay.tsx    # API key display card
│       │   ├── SwaggerUI.tsx        # Swagger UI integration
│       │   ├── UsageDashboard.tsx   # Usage analytics charts
│       │   └── ...
│       │
│       ├── pages/                # Page components
│       │   ├── Dashboard.tsx        # User dashboard
│       │   ├── APIs.tsx             # API catalog listing
│       │   ├── APIDetail.tsx        # API detail with Swagger UI
│       │   └── Admin.tsx            # Admin panel
│       │
│       ├── hooks/                # Custom React hooks
│       │   ├── useAuthUser.ts       # Authentication hook
│       │   ├── useApiCatalog.ts     # API catalog data
│       │   └── useSubscriptions.ts  # Subscriptions data
│       │
│       ├── services/             # API client services
│       │   ├── api.ts               # Backend API client
│       │   └── sbt-client.ts        # SBT Control Plane client
│       │
│       └── types/                # TypeScript type definitions
│           ├── api.ts
│           └── sbt.ts
│
└── examples/                     # Example CDK apps
    ├── simple-app.ts             # Basic standalone portal
    ├── sbt-integrated-app.ts     # With SBT integration
    └── multi-stack-app.ts        # Multi-stack architecture
```

## Key Files

### CDK Constructs

- **`src/developer-portal.ts`**: Main construct that orchestrates all sub-constructs
- **`src/constructs/api-gateway-backend.ts`**: Creates API Gateway, Lambda functions, and IAM roles
- **`src/constructs/frontend-hosting.ts`**: Sets up S3, CloudFront, and deploys frontend assets
- **`src/constructs/cognito-auth.ts`**: Configures Cognito User Pool, Identity Pool, and triggers
- **`src/constructs/api-catalog.ts`**: Manages S3 bucket for API specifications

### Backend Lambda

- **`src/lambda/backend/index.ts`**: Express.js app with all routes
- **`src/lambda/backend/lib/customers-controller.ts`**: Core business logic for API keys and subscriptions
- **`src/lambda/backend/lib/sbt-integration.ts`**: Client for SBT Control Plane API

### Frontend

- **`frontend/src/main.tsx`**: Entry point, configures Amplify
- **`frontend/src/App.tsx`**: Root component with routing
- **`frontend/src/components/APIKeyDisplay.tsx`**: Shows user's API key
- **`frontend/src/components/SwaggerUI.tsx`**: Interactive API documentation
- **`frontend/src/components/UsageDashboard.tsx`**: Charts for usage analytics

## Technology Stack

### Infrastructure (CDK)
- AWS CDK 2.x (TypeScript)
- @cdklabs/sbt-aws (SBT integration)

### Backend
- Node.js 20
- Express.js
- AWS SDK v3
- TypeScript

### Frontend
- React 18
- TypeScript
- Vite (build tool)
- AWS Amplify (auth)
- TanStack Query (data fetching)
- Chart.js (analytics)
- Swagger UI React (API docs)
- Tailwind CSS (styling)
- Lucide React (icons)

### AWS Services
- API Gateway (REST API)
- Lambda (Node.js 20)
- Cognito (User Pool + Identity Pool)
- DynamoDB (data storage)
- S3 (static hosting + API specs)
- CloudFront (CDN)
- IAM (permissions)
- CloudWatch (logging)

## Build & Deploy Flow

1. **Frontend Build**
   ```bash
   cd frontend
   npm install
   npm run build  # Outputs to frontend/dist/
   ```

2. **CDK Construct Build**
   ```bash
   npm install
   npm run build  # Compiles TypeScript to lib/
   ```

3. **Deploy**
   ```bash
   cdk deploy
   ```

4. **What Happens During Deploy**
   - Compiles TypeScript to JavaScript
   - Bundles Lambda functions with esbuild
   - Deploys CloudFormation stack
   - Uploads frontend to S3
   - Creates CloudFront distribution
   - Configures Cognito
   - Sets up API Gateway

## Development Workflow

### Local Frontend Development

```bash
cd frontend
npm run dev
# Access at http://localhost:3000
```

### Testing Lambda Functions Locally

```bash
cd src/lambda/backend
npm install
npm test
```

### CDK Development

```bash
# Watch mode for auto-compilation
npm run watch

# Synthesize CloudFormation
cdk synth

# Diff changes
cdk diff

# Deploy
cdk deploy
```

## Key Design Patterns

### 1. Construct Composition
The main `DeveloperPortal` construct composes several smaller constructs, following AWS CDK best practices.

### 2. SBT Integration
The `SBTClient` provides optional integration with SBT Control Plane, gracefully degrading when not configured.

### 3. Serverless Express
Lambda functions use `aws-serverless-express` to run Express.js apps, providing familiar routing patterns.

### 4. React Query
Frontend uses TanStack Query for server state management, caching, and automatic refetching.

### 5. CDK Bundling
Lambda functions are bundled with esbuild via `NodejsFunction` construct for optimized deployments.

## Customization Points

### Adding New API Endpoints

1. Create route file in `src/lambda/backend/routes/`
2. Add route to `src/lambda/backend/index.ts`
3. Update API Gateway in `src/constructs/api-gateway-backend.ts`

### Adding Frontend Components

1. Create component in `frontend/src/components/`
2. Use React Query for data fetching
3. Import and use in relevant page

### Extending SBT Integration

1. Add methods to `src/lambda/backend/lib/sbt-integration.ts`
2. Call from `customers-controller.ts` or route handlers
3. Update frontend to consume new features

## Security Considerations

- ✅ All Lambda functions use least-privilege IAM roles
- ✅ Cognito provides authentication and authorization
- ✅ API Gateway uses Cognito authorizer
- ✅ S3 buckets have public access blocked
- ✅ CloudFront requires HTTPS
- ✅ Security headers via CloudFront Function
- ✅ API keys stored securely in API Gateway
- ✅ Secrets never logged or exposed to frontend
