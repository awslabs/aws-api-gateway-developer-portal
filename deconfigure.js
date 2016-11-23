#!/usr/bin/env node
/*
* Convenience script to scrub templates.
* Especially useful during development of reference implementation.
*/
'use strict'

const fs = require('fs')
const packageJson = require('./package.json')
const config = packageJson.config

modifyApigClient(config.apiGatewayApiId, config.primaryAwsRegion)
modifyDevPortalJs(config.cognitoIdentityPoolId, config.primaryAwsRegion, config.cognitoRegion, config.cognitoUserPoolId, config.cognitoClientId)
modifySwaggerFile(config.accountId, config.primaryAwsRegion, config.apiGatewayApiName, config.expressLambdaFunctionName)
modifyExpressServer(config.siteS3Bucket, config.primaryAwsRegion)
modifyCloudFormation(config.cognitoIdentityPoolId)
modifyPackageFile(config)
modifyUiPackageFile(config.siteS3Bucket)

function modifyApigClient(apiGatewayApiId, primaryAwsRegion) {
    const apigClientPath = './dev-portal/public/apigateway-js-sdk/apigClient.js'
    const apigClient = fs.readFileSync(apigClientPath, 'utf8')
    const apiGatewayApiIdRegex = new RegExp(apiGatewayApiId, 'g')
    const primaryAwsRegionRegex = new RegExp(primaryAwsRegion, 'g')
    const apigClientModified = apigClient
        .replace(apiGatewayApiIdRegex, 'YOUR_API_GATEWAY_API_ID')
        .replace(primaryAwsRegionRegex, 'YOUR_PRIMARY_AWS_REGION')

    fs.writeFileSync(apigClientPath, apigClientModified, 'utf8')
}

function modifyDevPortalJs(cognitoIdentityPoolId, primaryAwsRegion, cognitoRegion, cognitoUserPoolId, cognitoClientId) {
    const htmlPath = './dev-portal/src/js/devportal.js'
    const html = fs.readFileSync(htmlPath, 'utf8')
    const cognitoIdentityPoolIdRegex = new RegExp(cognitoIdentityPoolId, 'g')
    const cognitoRegionRegex = new RegExp(`var cognitoRegion = '${cognitoRegion}'`, 'g')
    const primaryAwsRegionRegex = new RegExp(`var awsRegion = '${primaryAwsRegion}'`, 'g')
    const cognitoUserPoolIdRegex = new RegExp(cognitoUserPoolId, 'g')
    const cognitoClientIdRegex = new RegExp(cognitoClientId, 'g')
    const htmlModified = html
        .replace(cognitoIdentityPoolIdRegex, 'YOUR_COGNITO_IDENTITY_POOL_ID')
        .replace(cognitoUserPoolIdRegex, 'YOUR_COGNITO_USER_POOL_ID')
        .replace(cognitoClientIdRegex, 'YOUR_COGNITO_CLIENT_ID')
        .replace(primaryAwsRegionRegex, `var awsRegion = 'YOUR_PRIMARY_AWS_REGION'`)
        .replace(cognitoRegionRegex, `var cognitoRegion = 'YOUR_COGNITO_REGION'`)

    fs.writeFileSync(htmlPath, htmlModified, 'utf8')
}

function modifySwaggerFile(accountId, primaryAwsRegion, apiGatewayApiName, expressLambdaFunctionName) {
    const swaggerDefinitionPath = './lambdas/express/dev-portal-express-proxy-api.yaml'
    const swaggerDefinition = fs.readFileSync(swaggerDefinitionPath, 'utf8')
    const accountIdRegex = new RegExp(accountId, 'g')
    const expressLambdaFunctionNameRegex = new RegExp(expressLambdaFunctionName, 'g')
    const apiGatewayApiNameRegex = new RegExp(apiGatewayApiName, 'g')
    const primaryAwsRegionRegex = new RegExp(primaryAwsRegion, 'g')
    const simpleProxyApiModified = swaggerDefinition
        .replace(accountIdRegex, 'YOUR_ACCOUNT_ID')
        .replace(expressLambdaFunctionNameRegex, 'YOUR_LAMBDA_FUNCTION_NAME')
        .replace(apiGatewayApiNameRegex, 'YOUR_API_GATEWAY_API_NAME')
        .replace(primaryAwsRegionRegex, 'YOUR_PRIMARY_AWS_REGION')

    fs.writeFileSync(swaggerDefinitionPath, simpleProxyApiModified, 'utf8')
}

function modifyExpressServer(siteS3Bucket, primaryAwsRegion) {
    const expressServerPath = './lambdas/express/express-server.js'
    const expressServer = fs.readFileSync(expressServerPath, 'utf8')
    const siteS3BucketRegex = new RegExp(siteS3Bucket, 'g')
    const primaryAwsRegionRegex = new RegExp(primaryAwsRegion, 'g')
    const expressServerModified = expressServer
        .replace(siteS3BucketRegex, 'YOUR_CLIENT_BUCKET_NAME')
        .replace(primaryAwsRegionRegex, 'YOUR_PRIMARY_AWS_REGION')

    fs.writeFileSync(expressServerPath, expressServerModified, 'utf8')
}

function modifyCloudFormation(cognitoIdentityPoolId) {
    const cloudFormationPath = './cloudformation/base.yaml'
    const cloudFormation = fs.readFileSync(cloudFormationPath, 'utf8')
    const cognitoIdentityPoolIdRegex = new RegExp(cognitoIdentityPoolId, 'g')
    const cloudFormationModified = cloudFormation
        .replace(cognitoIdentityPoolIdRegex, 'YOUR_COGNITO_IDENTITY_POOL_ID')

    fs.writeFileSync(cloudFormationPath, cloudFormationModified, 'utf8')
}

function modifyPackageFile(config) {
    const packageJsonPath = './package.json'
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    const artifactsS3BucketRegex = new RegExp(`"artifactsS3Bucket": "${config.artifactsS3Bucket}"`, 'g')
    const siteS3BucketRegex = new RegExp(config.siteS3Bucket, 'g')
    const apiGatewayApiNameRegex = new RegExp(config.apiGatewayApiName, 'g')
    const expressLambdaFunctionNameRegex = new RegExp(`"expressLambdaFunctionName": "${config.expressLambdaFunctionName}"`, 'g')
    const accountIdRegex = new RegExp(config.accountId, 'g')
    const cloudFormationStackNameRegex = new RegExp(config.cloudFormationStackName, 'g')
    const primaryAwsRegionRegex = new RegExp(`"primaryAwsRegion": "${config.primaryAwsRegion}"`, 'g')
    const apiGatewayApiIdRegex = new RegExp(config.apiGatewayApiId, 'g')
    const cognitoRegionRegex = new RegExp(`"cognitoRegion": "${config.cognitoRegion}"`, 'g')
    const cognitoUserPoolIdRegex = new RegExp(config.cognitoUserPoolId, 'g')
    const cognitoClientIdRegex = new RegExp(config.cognitoClientId, 'g')
    const cognitoIdentityPoolIdRegex = new RegExp(config.cognitoIdentityPoolId, 'g')
    const packageJsonModified = packageJson
      .replace(artifactsS3BucketRegex, '"artifactsS3Bucket": "YOUR_ARTIFACTS_BUCKET_NAME"')
      .replace(siteS3BucketRegex, 'YOUR_CLIENT_BUCKET_NAME')
      .replace(apiGatewayApiNameRegex, 'YOUR_API_GATEWAY_API_NAME')
      .replace(expressLambdaFunctionNameRegex, '"expressLambdaFunctionName": "YOUR_LAMBDA_FUNCTION_NAME"')
      .replace(accountIdRegex, 'YOUR_ACCOUNT_ID')
      .replace(cloudFormationStackNameRegex, 'YOUR_CLOUDFORMATION_STACK_NAME')
      .replace(apiGatewayApiIdRegex, 'YOUR_API_GATEWAY_API_ID')
      .replace(cognitoUserPoolIdRegex, 'YOUR_COGNITO_USER_POOL_ID')
      .replace(cognitoClientIdRegex, 'YOUR_COGNITO_CLIENT_ID')
      .replace(cognitoIdentityPoolIdRegex, 'YOUR_COGNITO_IDENTITY_POOL_ID')
      .replace(primaryAwsRegionRegex, '"primaryAwsRegion": "YOUR_PRIMARY_AWS_REGION"')
      .replace(cognitoRegionRegex, '"cognitoRegion": "YOUR_COGNITO_REGION"')

    fs.writeFileSync(packageJsonPath, packageJsonModified, 'utf8')
}

function modifyUiPackageFile(siteS3Bucket) {
    const packageJsonPath = './dev-portal/package.json'
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    const siteS3BucketRegex = new RegExp(siteS3Bucket, 'g')
    const packageJsonModified = packageJson
      .replace(siteS3BucketRegex, 'YOUR_CLIENT_BUCKET_NAME')

    fs.writeFileSync(packageJsonPath, packageJsonModified, 'utf8')
}
