// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const { execute, r } = require('./utils.js')

const deployerConfig = require('../deployer.config.js')
const writeConfig = require('./write-config.js')

// required inputs
const stackName = deployerConfig.stackName
const buildAssetsBucket = deployerConfig.buildAssetsBucket
const siteAssetsBucket = deployerConfig.siteAssetsBucket
const apiAssetsBucket = deployerConfig.apiAssetsBucket

// required (and defaulted) inputs
const samTemplate = deployerConfig.samTemplate || r(`../../cloudformation/template.yaml`)
const packageConfig = deployerConfig.packageConfig || r(`../../cloudformation/packaged.yaml`)
const customersTableName = deployerConfig.customersTableName || 'DevPortalCustomers'

// optional inputs
const cognitoDomainName = deployerConfig.cognitoDomainName || ''
const staticAssetRebuildMode = deployerConfig.staticAssetRebuildMode || ''

function main() {
  Promise.resolve()
    .then(() => execute(`sam package --template-file ${samTemplate} --output-template-file ${packageConfig} --s3-bucket ${buildAssetsBucket}`, true))
    .then(() => execute(`sam deploy --template-file ${packageConfig} --stack-name ${stackName} --capabilities CAPABILITY_NAMED_IAM --parameter-overrides StaticAssetRebuildToken="${Date.now()}" StaticAssetRebuildMode="${staticAssetRebuildMode}" DevPortalSiteS3BucketName="${siteAssetsBucket}" ArtifactsS3BucketName="${apiAssetsBucket}" DevPortalCustomersTableName="${customersTableName}" CognitoDomainNameOrPrefix="${cognitoDomainName}" --s3-bucket ${buildAssetsBucket}`, true))
    .then(() => writeConfig(true))
    .then(() => console.log('\n' + 'Process Complete! Run `npm run start` to launch run the dev portal locally.\n'.green()))
    .catch(err => {
      console.log(("" + err).red())
    })
}

if (samTemplate && packageConfig && stackName && buildAssetsBucket && siteAssetsBucket && apiAssetsBucket && customersTableName) {
  main()
} else {
  !samTemplate && console.log('samTemplate must be defined')
  !packageConfig && console.log('packageConfig must be defined')
  !stackName && console.log('stackName must be defined')
  !buildAssetsBucket && console.log('buildAssetsBucket must be defined')
  !siteAssetsBucket && console.log('siteAssetsBucket must be defined')
  !apiAssetsBucket && console.log('apiAssetsBucket must be defined')
}
