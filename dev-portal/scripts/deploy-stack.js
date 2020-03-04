// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const { execute, r, red, green } = require('./utils.js')

const deployerConfig = require('../deployer.config.js')
const writeConfig = require('./write-config.js')

const errors = []

function getRequired (key) {
  const value = deployerConfig[key]
  if (value) return value
  errors.push(key + ' must be defined')
}

function getOptional (key, orElse) {
  return deployerConfig[key] || orElse
}

// required inputs
const stackName = getRequired('stackName')
const buildAssetsBucket = getRequired('buildAssetsBucket')
const siteAssetsBucket = getRequired('siteAssetsBucket')
const apiAssetsBucket = getRequired('apiAssetsBucket')
const cognitoDomainName = getRequired('cognitoDomainName')

// required (and defaulted) inputs
const samTemplate = getOptional('samTemplate', r('../../cloudformation/template.yaml'))
const packageConfig = getOptional('packageConfig', r('../../cloudformation/packaged.yaml'))
const customersTableName = getOptional('customersTableName', 'DevPortalCustomers')

// optional inputs
const staticAssetRebuildMode = getOptional('staticAssetRebuildMode', '')
const developmentMode = getOptional('developmentMode')

// AWS SAM CLI configuration
const awsSamCliProfile = getOptional('awsSamCliProfile')

async function main () {
  execute('sam', [
    'package',
    '--template-file', samTemplate,
    '--output-template-file', packageConfig,
    '--s3-bucket', buildAssetsBucket,
    ...(awsSamCliProfile ? ['--profile', awsSamCliProfile] : [])
  ])
  execute('sam', [
    'deploy',
    '--template-file', packageConfig,
    '--stack-name', stackName,
    '--capabilities', 'CAPABILITY_NAMED_IAM',
    '--parameter-overrides',
    `StaticAssetRebuildToken=${Date.now()}`,
    ...(staticAssetRebuildMode ? [`StaticAssetRebuildMode=${staticAssetRebuildMode}`] : []),
    `DevPortalSiteS3BucketName=${siteAssetsBucket}`,
    `ArtifactsS3BucketName=${apiAssetsBucket}`,
    `DevPortalCustomersTableName=${customersTableName}`,
    ...(developmentMode ? [`LocalDevelopmentMode=${developmentMode}`] : []),
    `CognitoDomainNameOrPrefix=${cognitoDomainName}`,
    '--s3-bucket', buildAssetsBucket,
    ...(awsSamCliProfile ? ['--profile', awsSamCliProfile] : [])
  ])
  await writeConfig()
  console.log()
  console.log(green('Process Complete! Run `npm run start` to launch run the dev portal locally.'))
  console.log()
}

if (errors.length) {
  for (const error of errors) console.error(red(error))
} else {
  main().catch(err => console.error(red(err)))
}
