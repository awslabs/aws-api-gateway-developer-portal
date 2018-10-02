## Development guide

```sh
# Generate a new build from your assets...
npm run build

# Package all assets via the SAM cli
sam package --template-file ./cloudformation/template.yaml --output-template-file packaged.yaml --s3-bucket nathaniels-dev-portal-build-assets

# Deploy the packaged assets.
sam deploy --template-file ./packaged.yaml --stack-name "nathaniels-dev-portal" --capabilities CAPABILITY_NAMED_IAM --parameter-overrides DevPortalSiteS3BucketName="nathaniels-dev-portal-site-assets" ArtifactsS3BucketName="nathaniels-dev-portal-api-assets"

# get the outputs
aws cloudformation describe-stacks --stack-name nathaniels-dev-portal

# fill config.js with the appropriate values listed in the 'outputs'
```
