## Development guide

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

### If you have already deployed a Development Portal...

1. Create a `deployer.config.js` file inside `/dev-portal/` with the following structure

```js
// replace each name with your bucket names

module.exports = {
  stackName: `my-cool-dev-portal`,
  buildAssetsBucket: `my-cool-dev-portal-build-assets`,
  siteAssetsBucket: `my-cool-dev-portal-site-assets`,
  apiAssetsBucket: `my-cool-dev-portal-api-assets`
}
```

2. Run `npm run deploy`.

### Batch-adding license information
Run these commands, then git add -p and filter out unnecessary changes. This will sometimes change the file's final line ending, mangle internal regex, etc., so do be attentive to the diffs.
- `for file in **/*.js; do echo -e "// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.\n// SPDX-License-Identifier: Apache-2.0\n\n$(cat $file)" > $file; done`
- `for file in **/*.jsx; do echo -e "// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.\n// SPDX-License-Identifier: Apache-2.0\n\n$(cat $file)" > $file; done`
- `for file in *.css; do echo -e "/* Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.\nSPDX-License-Identifier: Apache-2.0*/\n\n$(cat $file)" > $file; done`
