#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const AWS = require('aws-sdk')
const rootDir = path.resolve(__dirname, '..')
const packageJson = require(`${rootDir}/package.json`)
const primaryAwsRegion = packageJson.config.primaryAwsRegion

AWS.config.update({ region:primaryAwsRegion })
const cloudformation = new AWS.CloudFormation();

cloudformation.describeStacks({
  StackName: packageJson.config.cloudFormationStackName
})
.promise()
.then(data => {
  const stack = data.Stacks[0]
  const outputs = stack.Outputs
  const apiGatewayApiId = getOutputValue(outputs, 'ApiId')
  const cognitoIdentityPoolId = getOutputValue(outputs, 'CognitoIdentityPoolId')
  const cognitoUserPoolClientId = getOutputValue(outputs, 'CognitoUserPoolClientId')
  const cognitoUserPoolId = getOutputValue(outputs, 'CognitoUserPoolId')
  modifyPackageFile(apiGatewayApiId, primaryAwsRegion, cognitoUserPoolId, cognitoUserPoolClientId, cognitoIdentityPoolId)
  modifyDevPortalJs(cognitoIdentityPoolId, primaryAwsRegion, primaryAwsRegion, cognitoUserPoolId, cognitoUserPoolClientId)
  modifyApigClient(apiGatewayApiId, primaryAwsRegion)
}).catch(e => {console.log(e)})

function getOutputValue(outputs, key) {
  return outputs.find(o => o.OutputKey === key).OutputValue
}

function modifyPackageFile(apiGatewayApiId, cognitoRegion, cognitoUserPoolId, cognitoUserPoolClientId, cognitoIdentityPoolId) {
    const packageJsonPath = `${rootDir}/package.json`
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    const packageJsonModified = packageJson
        .replace(/YOUR_API_GATEWAY_API_ID/g, apiGatewayApiId)
        .replace(/YOUR_COGNITO_REGION/g, cognitoRegion)
        .replace(/YOUR_COGNITO_USER_POOL_ID/g, cognitoUserPoolId)
        .replace(/YOUR_COGNITO_CLIENT_ID/g, cognitoUserPoolClientId)
        .replace(/YOUR_COGNITO_IDENTITY_POOL_ID/g, cognitoIdentityPoolId)

    fs.writeFileSync(packageJsonPath, packageJsonModified, 'utf8')
}

function modifyDevPortalJs(cognitoIdentityPoolId, primaryAwsRegion, cognitoRegion, cognitoUserPoolId, cognitoUserPoolClientId) {
    const htmlPath = `${rootDir}/dev-portal/src/services/aws.js`
    const html = fs.readFileSync(htmlPath, 'utf8')
    const htmlModified = html
        .replace(/YOUR_COGNITO_IDENTITY_POOL_ID/g, cognitoIdentityPoolId)
        .replace(/YOUR_COGNITO_REGION/g, cognitoRegion)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)
        .replace(/YOUR_COGNITO_USER_POOL_ID/g, cognitoUserPoolId)
        .replace(/YOUR_COGNITO_CLIENT_ID/g, cognitoUserPoolClientId)

    fs.writeFileSync(htmlPath, htmlModified, 'utf8')
}

function modifyApigClient(apiGatewayApiId, primaryAwsRegion) {
    const apigClientPath = `${rootDir}/dev-portal/public/apigateway-js-sdk/apigClient.js`
    const apigClient = fs.readFileSync(apigClientPath, 'utf8')
    const apigClientModified = apigClient
        .replace(/YOUR_API_GATEWAY_API_ID/g, apiGatewayApiId)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)
    fs.writeFileSync(apigClientPath, apigClientModified, 'utf8')
}
