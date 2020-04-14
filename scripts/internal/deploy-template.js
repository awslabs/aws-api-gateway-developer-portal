// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
'use strict'

const { exec, p } = require('./util.js')
const deployerConfig = require('./get-deployer-config.js')

module.exports = async () => {
  const missing = []

  function getRequired (key) {
    const value = deployerConfig[key]
    if (value) return value
    missing.push(key)
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
  const samTemplate = getOptional('samTemplate', p('cloudformation/template.yaml'))
  const packageConfig = getOptional('packageConfig', p('cloudformation/packaged.yaml'))
  const customersTableName = getOptional('customersTableName')
  const preLoginAccountsTableName = getOptional('preLoginAccountsTableName')
  const feedbackTableName = getOptional('feedbackTableName')
  const cognitoIdentityPoolName = getOptional('cognitoIdentityPoolName')

  // optional inputs
  const staticAssetRebuildMode = getOptional('staticAssetRebuildMode', '')
  const developmentMode = getOptional('developmentMode')

  // AWS SAM CLI configuration
  const awsSamCliProfile = getOptional('awsSamCliProfile')

  if (missing.length) return missing

  await exec('sam', [
    'package',
    '--template-file', samTemplate,
    '--output-template-file', packageConfig,
    '--s3-bucket', buildAssetsBucket,
    ...(awsSamCliProfile ? ['--profile', awsSamCliProfile] : [])
  ])
  await exec('sam', [
    'deploy',
    '--template-file', packageConfig,
    '--stack-name', stackName,
    '--capabilities', 'CAPABILITY_NAMED_IAM',
    '--parameter-overrides',
    `StaticAssetRebuildToken=${Date.now()}`,
    ...(staticAssetRebuildMode ? [`StaticAssetRebuildMode=${staticAssetRebuildMode}`] : []),
    `DevPortalSiteS3BucketName=${siteAssetsBucket}`,
    `ArtifactsS3BucketName=${apiAssetsBucket}`,
    ...(customersTableName ? [`DevPortalCustomersTableName=${customersTableName}`] : []),
    ...(preLoginAccountsTableName ? [`DevPortalPreLoginAccountsTableName=${preLoginAccountsTableName}`] : []),
    ...(feedbackTableName ? [`DevPortalFeedbackTableName=${feedbackTableName}`] : []),
    ...(cognitoIdentityPoolName ? [`CognitoIdentityPoolName=${cognitoIdentityPoolName}`] : []),
    ...(developmentMode ? [`LocalDevelopmentMode=${developmentMode}`] : []),
    `CognitoDomainNameOrPrefix=${cognitoDomainName}`,
    '--s3-bucket', buildAssetsBucket,
    ...(awsSamCliProfile ? ['--profile', awsSamCliProfile] : [])
  ])
}
