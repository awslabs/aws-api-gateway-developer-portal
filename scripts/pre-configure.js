#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const AWS = require('aws-sdk')
const deconfigure = require('./deconfigure')
const rootDir = path.resolve(__dirname, '..')
const iam = new AWS.IAM()

iam.getUser({}, (err, data) => {
  let accountId

  if (!err && data && data.User && data.User.Arn) {
    accountId = data.User.Arn.split(':')[4]
  }

  const questions = [{
      name: 'primaryAwsRegion',
      message: 'Region:',
      type: 'list',
      choices: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-northeast-1', 'ap-northeast-2'],
      default: 'us-east-1'
  }, {
      name: 'artifactsS3BucketName',
      message: 'S3 bucket for artifacts such as Lambda package and Swagger file. You can provide an existing S3 bucket name, or a new one (in which case it will be created for you):',
      type: 'input',
      validate: value => /^[a-zA-Z0-9.\-_]{1,255}/.test(value)
  }, {
      name: 'clientS3BucketName',
      message: 'S3 bucket for developer portal web application. This must be a new bucket, and the name must be region-unique (ie. not just unique to your account), and it is therfore recommended you add a prefix or suffix, eg. my-org-developer-portal-app.:',
      type: 'input',
      validate: value => /^[a-zA-Z0-9.\-_]{1,255}/.test(value)
  }, {
      name: 'cloudFormationStackName',
      message: 'CloudFormation stack name:',
      type: 'input',
      default: 'DeveloperPortal',
      validate: value => /^[a-zA-Z][a-zA-Z0-9\-]*/.test(value)
  }/*, {
      name: 'apiGatewayApiName',
      message: 'API name:',
      type: 'input',
      default: 'Developer Portal'
  }, {
      name: 'expressLambdaFunctionName',
      message: 'Lambda function name:',
      type: 'input',
      default: 'DevPortalFunction'
  }*/]

  if (!accountId) {
    questions.unshift({
        name: 'accountId',
        message: 'AWS account id:',
        type: 'input',
        validate: value => value.length === 12
    })
  }

  inquirer.prompt(questions).then((answers) => {
    const apiGatewayApiName = 'Developer Portal'
    accountId = accountId || answers.accountId
    deconfigure()
    modifyPackageFile(answers.artifactsS3BucketName, answers.clientS3BucketName, answers.primaryAwsRegion,apiGatewayApiName, answers.cloudFormationStackName/*, answers.expressLambdaFunctionName*/, accountId)
    modifyUiPackageFile(answers.clientS3BucketName, answers.primaryAwsRegion)
    modifyExpressServer(answers.clientS3BucketName, answers.primaryAwsRegion)
    modifySwaggerFile(accountId, answers.primaryAwsRegion,apiGatewayApiName/*, answers.expressLambdaFunctionName*/)
  }).catch(e => {console.log(e)})
})

function modifyPackageFile(artifactsS3BucketName, clientS3BucketName, primaryAwsRegion, apiGatewayApiName, cloudFormationStackName/*, expressLambdaFunctionName*/, accountId) {
    const packageJsonPath = `${rootDir}/package.json`
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
    const packageJsonPath = `${rootDir}/dev-portal/package.json`
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    const packageJsonModified = packageJson
        .replace(/YOUR_CLIENT_BUCKET_NAME/g, clientS3BucketName)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)

    fs.writeFileSync(packageJsonPath, packageJsonModified, 'utf8')
}

function modifyExpressServer(clientS3BucketName, primaryAwsRegion) {
    const expressServerPath = `${rootDir}/lambdas/backend/express-server.js`
    const expressServer = fs.readFileSync(expressServerPath, 'utf8')
    const expressServerModified = expressServer
        .replace(/YOUR_CLIENT_BUCKET_NAME/g, clientS3BucketName)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)

    fs.writeFileSync(expressServerPath, expressServerModified, 'utf8')
}

function modifySwaggerFile(accountId, primaryAwsRegion, apiGatewayApiName/*, expressLambdaFunctionName*/) {
    const swaggerDefinitionPath = `${rootDir}/lambdas/backend/dev-portal-express-proxy-api.yaml`
    const swaggerDefinition = fs.readFileSync(swaggerDefinitionPath, 'utf8')
    const simpleProxyApiModified = swaggerDefinition
        .replace(/YOUR_ACCOUNT_ID/g, accountId)
        // .replace(/YOUR_LAMBDA_FUNCTION_NAME/g, expressLambdaFunctionName)
        .replace(/YOUR_API_GATEWAY_API_NAME/g, apiGatewayApiName)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)

    fs.writeFileSync(swaggerDefinitionPath, simpleProxyApiModified, 'utf8')
}
