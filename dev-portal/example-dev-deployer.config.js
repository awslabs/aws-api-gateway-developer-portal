// It's recommended you track your live deployments here. You can change this
// any time you want to do a fresh deployment.
// Live: 0
const n = 0

module.exports = {
  // Required, bucket must be pre-made
  buildAssetsBucket: 'YOUR_LAMBDA_ARTIFACTS_BUCKET_NAME',

  // Required, created by stack
  stackName: 'dev-portal',
  siteAssetsBucket: 'CUSTOM_PREFIX-dev-portal-static-assets',
  apiAssetsBucket: 'CUSTOM_PREFIX-dev-portal-artifacts',

  // Required, turns on cognito hosted sign in/sign up UI
  cognitoDomainName: `YOUR_NAMESPACE-auth${n}`,

  // Optional, created by stack
  customersTableName: `DevPortalCustomers${n}`,
  preLoginAccountsTableName: `DevPortalPreLoginAccounts${n}`,
  feedbackTableName: `DevPortalFeedback${n}`,

  // optional, created by stack
  // It's recommended you set this, though, for easier identification later.
  cognitoIdentityPoolName: `DevPortalIdentityPool${n}`,

  // Always nuke and rebuild
  staticAssetRebuildMode: 'overwrite-content',

  // AWS SAM CLI profile option: optional specific profile from your AWS credential file. Not used
  // by default.
  // awsSamCliProfile: 'my-profile',

  // Set this to `true` if you want to enable development mode. It's `false` by default, and unless
  // you're actively developing on the developer portal itself locally, you should generally leave
  // it unset as it disables most protections, including CORS.
  // developmentMode: false,
}

module.exports = {
  // required; bucket must be pre-made
  buildAssetsBucket: `YOUR_LAMBDA_ARTIFACTS_BUCKET_NAME`,

  // required, created by stack
  stackName: `YOUR_NAMESPACE-dev-portal${n}`,
  siteAssetsBucket: `YOUR_NAMESPACE-dev-portal-static-assets${n}`,
  apiAssetsBucket: `YOUR_NAMESPACE-dev-portal-artifacts${n}`,

  // optional, created by stack
  cognitoDomainName: `YOUR_NAMESPACE-auth${n}`,
  customersTableName: `DevPortalCustomers${n}`,
  preLoginAccountsTableName: `DevPortalPreLoginAccounts${n}`,
  feedbackTableName: `DevPortalFeedback${n}`,

  // required; Turns on cognito hosted sign in / sign up UI
  cognitoDomainName: `CUSTOM_PREFIX-auth`,

  // optional, created by stack
  // It's recommended you set this, though, for easier identification later.
  cognitoIdentityPoolName: `DevPortalIdentityPool${n}`,

  // AWS SAM CLI profile option: optional specific profile from your AWS credential file. Not used
  // by default.
  // awsSamCliProfile: 'my-profile',

  // Always nuke and rebuild
  staticAssetRebuildMode: 'overwrite-content',

  // Set this to `true` if you want to enable development mode. It's `false` by default, and unless
  // you're actively developing on the developer portal itself locally, you should generally leave
  // it unset as it disables most CORS protections.
  developmentMode: true
}