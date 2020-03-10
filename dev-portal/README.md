## Development guide

Note: this is for advanced users who want to modify the developer portal code itself.

### Getting Started

1. Make sure you have [Node](https://nodejs.org/en/download/) installed - the setup process assumes you have at least Node v11, but v12 is recommended.

1. Make sure you have the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html) and the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) installed - these are required for `npm run deploy` to work.

2. Navigate to the `/dev-portal/` folder, and run `npm install`

3. Create a private S3 bucket for putting zipped lambda functions and zipped templates in. Note the bucket name for the next step. (This can be the same one you used during in the initial deployment)

4. Create a `deployer.config.js` file inside `/dev-portal/` with the structure below. We recommend using the same values you used during the initial deployment. (You can put this elsewhere and pass `DEPLOYER_CONFIG=/path/to/deployer.config.js` as an environment variable, in case you would prefer to manage it outside the repo.)

  ```js
  // replace your-lambda-artifacts-bucket-name with the name of the bucket you created in step 1
  // then, replace 'custom-prefix-' in siteAssetsBucket and apiAssetsBucket with your name / your org name / some unique identifier
  // the resulting bucket names need to be globally unique

  module.exports = {
    // required; bucket must be pre-made
    buildAssetsBucket: 'YOUR_LAMBDA_ARTIFACTS_BUCKET_NAME',

    // required; created by stack
    stackName: 'dev-portal',
    siteAssetsBucket: 'CUSTOM_PREFIX-dev-portal-static-assets',
    apiAssetsBucket: 'CUSTOM_PREFIX-dev-portal-artifacts',
    
    // required; Turns on cognito hosted sign in / sign up UI
    cognitoDomainName: 'CUSTOM_PREFIX-auth',
    
    // optional values (uncomment and change values if you want to use them)

    // Change the name of the customers table. Useful for multiple stacks.
    // Defaults to `'DevPortalCustomers'`.
    // customersTableName: 'CustomPrefixDevPortalCustomers',

    // Change the name of the pre-login accounts table. Useful for multiple
    // stacks. Defaults to `'DevPortalPreLoginAccounts'`.
    // preLoginAccountsTableName: 'CustomPrefixDevPortalPreLoginAccounts',
    
    // Change the name of the pre-login accounts table. Useful for multiple
    // stacks. Defaults to `'DevPortalFeedback'`.
    // feedbackTableName: 'CustomPrefixDevPortalFeedback',

    // Set this to overwrite-content if you want to reset your custom content
    // back to the defaults. Defaults to `''`.
    // staticAssetRebuildMode: 'overwrite-content', // ONLY SET
    
    // AWS SAM CLI profile option: optional specific profile from your AWS
    // credential file. Not used by default.
    // awsSamCliProfile: 'my-profile',
    
    // Set this to `true` if you want to enable development mode. It's `false`
    // by default, and unless you're actively developing on the developer portal
    // itself locally, you should generally leave it unset as it disables most
    // protections, including CORS.
    // developmentMode: false
  }
  ```

  If you need to develop in a fresh environment (say, for contributing back to the developer portal or for some more advanced customization), you can customize this further, and you may find the following config much easier to work with. The fields are the same, just you can switch between deployments far more easily.

  ```js
  // It's recommended you track your live deployments here. You can change this
  // any time you want to do a fresh deployment.
  // Live: 0
  const n = 0

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
    
    // AWS SAM CLI profile option: optional specific profile from your AWS
    // credential file. Not used by default.
    // awsSamCliProfile: 'my-profile',

    // Always nuke and rebuild
    staticAssetRebuildMode: 'overwrite-content',

    // Set this to `true` if you want to enable development mode. It's `false`
    // by default, and unless you're actively developing on the developer portal
    // itself locally, you should generally leave it unset as it disables most
    // CORS protections.
    developmentMode: true
  }
  ```

5. Run `npm run release`. This will build the static assets, deploy them, and generate the `dev-portal/public/config.js` file needed for local development. Take note of the bucket names you use.

6. Run `npm run start` to start the local development server at `localhost:3000`.

7. If you created the stack for the first time, you'll need to register a new admin account. In the dev portal, register it as an ordinary user, then go into the Cognito user pool generated for it (you can find it by going to the deployed stack in CloudFormation and searching for "CognitoUserPool" in the "Logical ID" column), search for the account in question (by email is easiest), open it, and add it to the admin group (look for `${STACK_NAME}AdminsGroup`).

7. Make changes locally, test them at `localhost:3000`, and, when satisfied, run `npm run release` to build and upload the changes to your  cloud dev portal.

### npm Scripts

### `build` -- `npm run build`

Builds a production-quality build and copies it to the lambda uploader.

### `deploy` -- `npm run deploy`

Starts a `sam package` and `sam deploy`. Does not build, but does write the config after a successful deploy.

### `write-config` -- `npm run write-config`

Gets the output from the CFN stack and writes a local version of the config.js file, so that you can run locally.

### `release` -- `npm run release`

Synonymous with `npm run build; npm run deploy; npm run write-config`.

### `start` -- `npm run start`

Starts up the local development server. Must have a `config.js` file locally for this to work.

### Notes on static assets

The static assets are only re-uploaded on deployment if the previous deployment and the current deployment were provided different `StaticAssetRebuildToken` parameters. The `npm run deploy` script automatically creates a unique `StaticAssetRebuildToken` for you.

### Batch-adding license information
Run these commands, then git add -p and filter out unnecessary changes. This will sometimes change the file's final line ending, mangle internal regex, etc., so do be attentive to the diffs.
- `for file in **/*.js; do echo -e "// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.\n// SPDX-License-Identifier: Apache-2.0\n\n$(cat $file)" > $file; done`
- `for file in **/*.jsx; do echo -e "// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.\n// SPDX-License-Identifier: Apache-2.0\n\n$(cat $file)" > $file; done`
- `for file in *.css; do echo -e "/* Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.\nSPDX-License-Identifier: Apache-2.0*/\n\n$(cat $file)" > $file; done`
