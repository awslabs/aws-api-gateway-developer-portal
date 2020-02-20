## Development guide

### Getting Started
1. Make sure you have the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html) and the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) installed - these are required for `npm run deploy` to work.

2. Navigate to the `/dev-portal/` folder, and run `npm install`

3. Create a private S3 bucket for putting zipped lambda functions and zipped templates in. Note the bucket name for the next step. (This can be the same one you used during in the initial deployment)

4. Create a `deployer.config.js` file inside `/dev-portal/` with the structure below. We recommend using the same values you used during the initial deployment.
```js
// replace your-lambda-artifacts-bucket-name with the name of the bucket you created in step 1
// then, replace 'custom-prefix-' in siteAssetsBucket and apiAssetsBucket with your name / your org name / some unique identifier
// the resulting bucket names need to be globally unique

module.exports = {
  // required; bucket must be pre-made
  buildAssetsBucket: `YOUR_LAMBDA_ARTIFACTS_BUCKET_NAME`,

  // required; created by stack
  stackName: `dev-portal`,
  siteAssetsBucket: `CUSTOM_PREFIX-dev-portal-static-assets`,
  apiAssetsBucket: `CUSTOM_PREFIX-dev-portal-artifacts`,
  
  // required; Turns on cognito hosted sign in / sign up UI
  cognitoDomainName: `CUSTOM_PREFIX-auth`,
  
  // optional values (uncomment and change values if you want to use them)

  // Change the name of the customer's table. Useful for multiple stacks. Defaults to `DevPortalCustomers`
  // customersTableName: `DevPortalCustomers`,

  // Set this to overwrite-content if you want to reset your custom content back to the defaults. Defaults to ``
  // staticAssetRebuildMode: `overwrite-content`, // ONLY SET
  
  // AWS SAM CLI profile option: optional specific profile from your AWS credential file. Not used by default
  //awsSamCliProfile: "my-profile",
  
  // Set this to `true` if you want to enable development mode. It's `false` by default, and unless you're actively developing on the developer portal itself locally, you should generally leave it unset as it disables most CORS protections.
  //developmentMode: false
}
```
5. Run `npm run release`. This will build the static assets, deploy them, and generate the `dev-portal/public/config.js` file needed for local development. Take note of the bucket names you use

6. Run `npm run start` to start the local development server at `localhost:3000`.

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
