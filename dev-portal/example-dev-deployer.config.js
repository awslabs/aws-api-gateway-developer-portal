// See `example-deployer.config.js` in this directory for more detailed documentation of each of
// the relevant options.
// 
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