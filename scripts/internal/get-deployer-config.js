'use strict'

// Note: be sure to update `BUILDING.md` any time you add or remove options.

const path = require('path')
const { p } = require('./util.js')

// Don't attempt to load anything in Travis.
if (process.env.TRAVIS) return

const deployerConfigName = process.env.DEPLOYER_CONFIG
  ? path.resolve(process.env.DEPLOYER_CONFIG)
  : p('dev-portal/deployer.config.js')

const deployerConfig = require(deployerConfigName)

const missing = []

function getRequired (key) {
  const value = deployerConfig[key]
  if (value) return value
  exports.missing.push(key)
}

function getOptional (key, orElse) {
  return deployerConfig[key] != null ? deployerConfig[key] : orElse
}

function getOptionalPath (key, orElse) {
  return deployerConfig[key] != null
    ? path.resolve(path.dirname(deployerConfigName), deployerConfig[key])
    : p(orElse)
}

// required inputs
exports.stackName = getRequired('stackName')
exports.buildAssetsBucket = getRequired('buildAssetsBucket')
exports.siteAssetsBucket = getRequired('siteAssetsBucket')
exports.apiAssetsBucket = getRequired('apiAssetsBucket')
exports.cognitoDomainName = getRequired('cognitoDomainName')

// required (and defaulted) inputs
exports.samTemplate = getOptionalPath('samTemplate', 'cloudformation/template.yaml')
exports.packageConfig = getOptionalPath('packageConfig', 'cloudformation/packaged.yaml')
exports.region = getOptional('region', 'us-east-1')
exports.customersTableName = getOptional('customersTableName')
exports.preLoginAccountsTableName = getOptional('preLoginAccountsTableName')
exports.feedbackTableName = getOptional('feedbackTableName')
exports.cognitoIdentityPoolName = getOptional('cognitoIdentityPoolName')
// FIXME: Marketplace support is currently broken
// exports.marketplaceSubscriptionTopic = getOptional('marketplaceSubscriptionTopic')
exports.accountRegistrationMode = getOptional('accountRegistrationMode')

// optional inputs
exports.feedbackEmail = getOptional('feedbackEmail')
exports.cognitoDomainAcmCertArn = getOptional('cognitoDomainAcmCertArn')
exports.customDomainName = getOptional('customDomainName')
exports.customDomainNameAcmCertArn = getOptional('customDomainNameAcmCertArn')
exports.useRoute53Nameservers = getOptional('useRoute53Nameservers')
exports.staticAssetRebuildMode = getOptional('staticAssetRebuildMode')
exports.developmentMode = getOptional('developmentMode')
exports.edgeLambdaRebuildToken = getOptional('edgeLambdaRebuildToken')

// AWS SAM CLI configuration
exports.awsSamCliProfile = getOptional('awsSamCliProfile')

exports.error = missing.length
  ? new Error(missing.map(key => key + ' must be defined').join('\n'))
  : null
