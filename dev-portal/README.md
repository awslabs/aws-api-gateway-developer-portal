## Development guide

```sh
# Generate a new build from your assets...
npm run build

# Package all assets via the SAM cli
sam package --template-file ./cloudformation/template.yaml --output-template-file packaged.yaml --s3-bucket my-cool-dev-portal-build-assets

# Deploy the packaged assets.
sam deploy --template-file ./packaged.yaml --stack-name "my-cool-dev-portal" --capabilities CAPABILITY_NAMED_IAM --parameter-overrides DevPortalSiteS3BucketName="my-cool-dev-portal-site-assets" ArtifactsS3BucketName="my-cool-dev-portal-api-assets"

# get the outputs
aws cloudformation describe-stacks --stack-name my-cool-dev-portal

# fill config.js with the appropriate values listed in the 'outputs'
```

To use the build script, create a `build.config.js` file inside dev-portal.

```js
module.exports = {
  stackName: `my-cool-dev-portal`,
  buildAssetsBucket: `my-cool-dev-portal-build-assets`,
  siteAssetsBucket: `my-cool-dev-portal-site-assets`,
  apiAssetsBucket: `my-cool-dev-portal-api-assets`
}
```

Then, just run `node scripts/build.js`.