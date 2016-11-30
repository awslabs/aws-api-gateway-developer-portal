#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const deconfigure = require('./deconfigure')
const rootDir = path.resolve(__dirname, '..')

const questions = [{
    name: 'accountId',
    message: 'AWS account id:',
    type: 'input',
    validate: value => value.length === 12
}, {
    name: 'primaryAwsRegion',
    message: 'Region:',
    type: 'list',
    choices: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-northeast-1', 'ap-northeast-2'],
    default: 'us-east-1'
}, {
    name: 'artifactsS3BucketName',
    message: 'S3 bucket for artifacts such as Lambda package and Swagger file (will be created if it doesn\'t exist):',
    type: 'input',
    validate: value => /^[a-zA-Z0-9.\-_]{1,255}/.test(value)
}, {
    name: 'clientS3BucketName',
    message: 'S3 bucket for website (will be created; do not provide existing bucket):',
    type: 'input',
    validate: value => /^[a-zA-Z0-9.\-_]{1,255}/.test(value)
}, {
    name: 'cloudFormationStackName',
    message: 'CloudFormation stack name:',
    type: 'input',
    default: 'DevPortalStack',
    validate: value => /^[a-zA-Z][a-zA-Z0-9\-]*/.test(value)
}, {
    name: 'apiGatewayApiName',
    message: 'API name:',
    type: 'input',
    default: 'Developer Portal'
}/*, {
    name: 'expressLambdaFunctionName',
    message: 'Lambda function name:',
    type: 'input',
    default: 'DevPortalFunction'
}*/]

inquirer.prompt(questions).then((answers) => {
  deconfigure()
  modifyPackageFile(answers.artifactsS3BucketName, answers.clientS3BucketName, answers.primaryAwsRegion, answers.apiGatewayApiName, answers.cloudFormationStackName/*, answers.expressLambdaFunctionName*/, answers.accountId)
  modifyUiPackageFile(answers.clientS3BucketName, answers.primaryAwsRegion)
  modifyExpressServer(answers.clientS3BucketName, answers.primaryAwsRegion)
  modifySwaggerFile(answers.accountId, answers.primaryAwsRegion, answers.apiGatewayApiName/*, answers.expressLambdaFunctionName*/)
}).catch(e => {console.log(e)})

function modifyPackageFile(artifactsS3BucketName, clientS3BucketName, primaryAwsRegion, apiGatewayApiName, cloudFormationStackName/*, expressLambdaFunctionName*/, accountId) {
    const packageJsonPath = `${rootDir}./package.json`
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    const packageJsonModified = packageJson
        .replace(/YOUR_ARTIFACTS_BUCKET_NAME/g, artifactsS3BucketName)
        .replace(/YOUR_CLIENT_BUCKET_NAME/g, clientS3BucketName)
        .replace(/YOUR_API_GATEWAY_API_NAME/g, apiGatewayApiName)
        // .replace(/YOUR_LAMBDA_FUNCTION_NAME/g, expressLambdaFunctionName)
        .replace(/YOUR_ACCOUNT_ID/g, accountId)
        .replace(/YOUR_CLOUDFORMATION_STACK_NAME/g, cloudFormationStackName)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)

    fs.writeFileSync(packageJsonPath, packageJsonModified, 'utf8')
}

function modifyUiPackageFile(clientS3BucketName, primaryAwsRegion) {
    const packageJsonPath = `${rootDir}./dev-portal/package.json`
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    const packageJsonModified = packageJson
        .replace(/YOUR_CLIENT_BUCKET_NAME/g, clientS3BucketName)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)

    fs.writeFileSync(packageJsonPath, packageJsonModified, 'utf8')
}

function modifyExpressServer(clientS3BucketName, primaryAwsRegion) {
    const expressServerPath = `${rootDir}./lambdas/backend/express-server.js`
    const expressServer = fs.readFileSync(expressServerPath, 'utf8')
    const expressServerModified = expressServer
        .replace(/YOUR_CLIENT_BUCKET_NAME/g, clientS3BucketName)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)

    fs.writeFileSync(expressServerPath, expressServerModified, 'utf8')
}

function modifySwaggerFile(accountId, primaryAwsRegion, apiGatewayApiName/*, expressLambdaFunctionName*/) {
    const swaggerDefinitionPath = `${rootDir}./lambdas/backend/dev-portal-express-proxy-api.yaml`
    const swaggerDefinition = fs.readFileSync(swaggerDefinitionPath, 'utf8')
    const simpleProxyApiModified = swaggerDefinition
        .replace(/YOUR_ACCOUNT_ID/g, accountId)
        // .replace(/YOUR_LAMBDA_FUNCTION_NAME/g, expressLambdaFunctionName)
        .replace(/YOUR_API_GATEWAY_API_NAME/g, apiGatewayApiName)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)

    fs.writeFileSync(swaggerDefinitionPath, simpleProxyApiModified, 'utf8')
}
