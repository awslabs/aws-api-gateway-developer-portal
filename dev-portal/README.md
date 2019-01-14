## Development guide

### Getting Started
1. Navigate to the `/dev-portal/` folder, and run `npm install`

1. Create a private S3 bucket for putting zipped lambda functions and zipped templates in. Note the bucket name for the next step. (This can be the same one you used during in the initial deployment)

2. Create a `deployer.config.js` file inside `/dev-portal/` with the following structure:
We recommend using the same values you used during the initial deployment.
```js
// replace your-lambda-artifacts-bucket-name with the name of the bucket you created in step 1
// then, replace 'custom-prefix-' in siteAssetsBucket and apiAssetsBucket with your name / your org name / some unique identifier
// the resulting bucket names need to be globally unique

module.exports = {
  stackName: `dev-portal`,
  buildAssetsBucket: `your-lambda-artifacts-bucket-name`,
  siteAssetsBucket: `custom-prefix-dev-portal-static-assets`,
  apiAssetsBucket: `custom-prefix-dev-portal-artifacts`
}
```

3. Run `npm run release`. This will build the static assets, deploy them, and generate the `dev-portal/public/config.js` file needed for local development. Take note of the bucket names you use

4. Run `npm run start` to start the local development server at `localhost:3000`.

5. Make changes locally, test them at `localhost:3000`, and, when satisfied, run `npm run release` to build and upload the changes to your  cloud dev portal.

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
