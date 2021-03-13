// See `example-deployer.config.js` in this directory for setup instructions and the "Deployer
// configuration" section of `BUILDING.md` for documentation on each of the parameters.
//
// It's recommended you track your live deployments here. You can change this any time you want to
// do a fresh deployment.
// Live: 0
'use strict'

const n = 0

module.exports = {
  buildAssetsBucket: 'YOUR_LAMBDA_ARTIFACTS_BUCKET_NAME',

  // All of these are parametric over `n` so that if you need to have multiple stacks deployed
  // during development or if you need to tear down a stack and don't want to wait for it to
  // completely be torn down before deploying the replacement stack, you can just do it without
  // much work.
  stackName: `dev-portal${n}`,
  siteAssetsBucket: `CUSTOM_PREFIX-dev-portal-static-assets${n}`,
  apiAssetsBucket: `CUSTOM_PREFIX-dev-portal-artifacts${n}`,
  cognitoDomainName: `CUSTOM_PREFIX-auth${n}`,
  customersTableName: `DevPortalCustomers${n}`,
  preLoginAccountsTableName: `DevPortalPreLoginAccounts${n}`,
  feedbackTableName: `DevPortalFeedback${n}`,

  // Optional, but highly recommended for easier identification.
  cognitoIdentityPoolName: `DevPortalIdentityPool${n}`,

  // Optional, but highly recommended so you can keep the site in sync with what's in the repo.
  staticAssetRebuildMode: 'overwrite-content',

  // Set development mode for local use.
  developmentMode: true

  // Toggle this any time the edge lambda or its replicator lambda are updated. In general, unless
  // either you're modifying them yourself or they were changed upstream and you just pulled those
  // changes, you shouldn't need to do anything about this value.
  // edgeLambdaResetToken: 'reset',
}
