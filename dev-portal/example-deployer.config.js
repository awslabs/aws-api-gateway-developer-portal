// 1. Replace your-lambda-artifacts-bucket-name with the name of the bucket you created in step 3
//    of the dev setup.
// 2. Then, replace 'custom-prefix-' in siteAssetsBucket and apiAssetsBucket with your name, your
//    org name, or some other unique identifier.
//
// The resulting bucket names must be globally unique.
module.exports = {
  // Required, bucket must be pre-made
  buildAssetsBucket: 'YOUR_LAMBDA_ARTIFACTS_BUCKET_NAME',

  // Required, created by stack
  stackName: 'dev-portal',
  siteAssetsBucket: 'CUSTOM_PREFIX-dev-portal-static-assets',
  apiAssetsBucket: 'CUSTOM_PREFIX-dev-portal-artifacts',

  // Required, turns on cognito hosted sign in/sign up UI
  cognitoDomainName: 'CUSTOM_PREFIX-auth',

  // Optional values (uncomment and change values if you want to use them)

  // Change the name of the customers table. Useful for multiple stacks. Defaults to
  // `'DevPortalCustomers'`.
  // customersTableName: 'CustomPrefixDevPortalCustomers',

  // Change the name of the pre-login accounts table. Useful for multiple stacks. Defaults to
  // `'DevPortalPreLoginAccounts'`.
  // preLoginAccountsTableName: 'CustomPrefixDevPortalPreLoginAccounts',

  // Change the name of the pre-login accounts table. Useful for multiple stacks. Defaults to
  // `'DevPortalFeedback'`.
  // feedbackTableName: 'CustomPrefixDevPortalFeedback',

  // Set this to overwrite-content if you want to reset your custom content back to the defaults.
  // Defaults to `''`.
  // staticAssetRebuildMode: 'overwrite-content', // ONLY SET

  // AWS SAM CLI profile option: optional specific profile from your AWS credential file. Not used
  // by default.
  // awsSamCliProfile: 'my-profile',

  // Set this to `true` if you want to enable development mode. It's `false` by default, and unless
  // you're actively developing on the developer portal itself locally, you should generally leave
  // it unset as it disables most protections, including CORS.
  // developmentMode: false,
}