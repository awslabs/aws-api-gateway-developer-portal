// Here's how you set this up:
//
// 1. Replace YOUR_LAMBDA_ARTIFACTS_BUCKET_NAME with the name of the bucket you created in step 3
//    of the dev setup.
// 2. Replace 'CUSTOM_PREFIX' in the properties that have it with your name, your org name, or some
//    other unique identifier. For the S3 buckets and the Cognito user pool domain prefix, they
//    must be globally unique. For the CloudFormation stack name, it need only be unique to all
//    stacks deployed to your account.
// 3. Set any other optional parameters as desired. For the DynamoDB tables, their names must be
//    unique to all DynamoDB tables within your account.
// 4. Save the file.
//
// Note: these configuration parameters are *not* the same as the SAM template parameters - the names differ and the behavior in many areas also differ. Furthermore, some SAM template parameters like `StaticAssetsRebuildToken` are handled automatically internally and cannot be configured.
//
// See the "Deployer configuration" section of `BUILDING.md` for documentation on each of the parameters.
'use strict'

module.exports = {
  // Optional, but recommended if you have multiple active AWS CLI profiles.
  // awsSamCliProfile: 'your-profile',

  buildAssetsBucket: 'YOUR_LAMBDA_ARTIFACTS_BUCKET_NAME',

  stackName: 'CUSTOM_PREFIX-dev-portal',
  siteAssetsBucket: 'CUSTOM_PREFIX-dev-portal-static-assets',
  apiAssetsBucket: 'CUSTOM_PREFIX-dev-portal-artifacts',
  cognitoDomainName: 'CUSTOM_PREFIX-auth'

  // Optional, but highly encouraged if you have such a domain ready. Not all of these may apply.
  // customDomainName: 'developer.domain.example',
  // customDomainNameAcmCertArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
  // cognitoDomainAcmCertArn: 'arn:aws:acm:us-east-1:123456789012:certificate/98765432-9876-9876-9876-987654321098',
  // useRoute53Nameservers: true,
  // feedbackEmail: 'admin@domain.example',

  // Toggle this any time the edge lambda or its replicator lambda need updated. You will be told in
  // the migration instructions to do so if you need to.
  // edgeLambdaResetToken: 'reset',
}
