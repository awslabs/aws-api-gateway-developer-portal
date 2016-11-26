#!/usr/bin/env node
'use strict'

const fs = require('fs')
const inquirer = require('inquirer')
const packageJson = require('./package.json')
const primaryAwsRegion = packageJson.config.primaryAwsRegion

const questions = [{
    name: 'apiGatewayApiId',
    message: 'API ID:',
    type: 'input'
}, {
    name: 'expressLambdaFunctionName',
    message: 'Dev Portal Lambda Function Name:',
    type: 'input'
}/*, {
    name: 'cognitoRegion',
    message: 'Cognito region:',
    type: 'list',
    choices: ['us-east-1', 'us-west-2'],
    default: 'us-east-1'
}*/, {
    name: 'cognitoUserPoolId',
    message: 'Cognito User Pool ID:',
    type: 'input'
}, {
    name: 'cognitoClientId',
    message: 'Cognito Client ID:',
    type: 'input'
}, {
    name: 'cognitoIdentityPoolId',
    message: 'Cognito Identity Pool ID:',
    type: 'input'
}]

inquirer.prompt(questions).then((answers) => {
    modifyPackageFile(answers.apiGatewayApiId, answers.expressLambdaFunctionName, primaryAwsRegion, answers.cognitoUserPoolId, answers.cognitoClientId, answers.cognitoIdentityPoolId)
    modifyDevPortalJs(answers.cognitoIdentityPoolId, primaryAwsRegion, primaryAwsRegion, answers.cognitoUserPoolId, answers.cognitoClientId)
    modifyApigClient(answers.apiGatewayApiId, primaryAwsRegion)
    modifySwaggerFile(answers.expressLambdaFunctionName)
}).catch(e => {console.log(e)})


function modifyPackageFile(apiGatewayApiId, expressLambdaFunctionName, cognitoRegion, cognitoUserPoolId, cognitoClientId, cognitoIdentityPoolId) {
    const packageJsonPath = './package.json'
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    const packageJsonModified = packageJson
        .replace(/YOUR_API_GATEWAY_API_ID/g, apiGatewayApiId)
        .replace(/YOUR_LAMBDA_FUNCTION_NAME/g, expressLambdaFunctionName)
        .replace(/YOUR_COGNITO_REGION/g, cognitoRegion)
        .replace(/YOUR_COGNITO_USER_POOL_ID/g, cognitoUserPoolId)
        .replace(/YOUR_COGNITO_CLIENT_ID/g, cognitoClientId)
        .replace(/YOUR_COGNITO_IDENTITY_POOL_ID/g, cognitoIdentityPoolId)

    fs.writeFileSync(packageJsonPath, packageJsonModified, 'utf8')
}

function modifyDevPortalJs(cognitoIdentityPoolId, primaryAwsRegion, cognitoRegion, cognitoUserPoolId, cognitoClientId) {
    const htmlPath = './dev-portal/src/services/aws.js'
    const html = fs.readFileSync(htmlPath, 'utf8')
    const htmlModified = html
        .replace(/YOUR_COGNITO_IDENTITY_POOL_ID/g, cognitoIdentityPoolId)
        .replace(/YOUR_COGNITO_REGION/g, cognitoRegion)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)
        .replace(/YOUR_COGNITO_USER_POOL_ID/g, cognitoUserPoolId)
        .replace(/YOUR_COGNITO_CLIENT_ID/g, cognitoClientId)

    fs.writeFileSync(htmlPath, htmlModified, 'utf8')
}

function modifyApigClient(apiGatewayApiId, primaryAwsRegion) {
    const apigClientPath = './dev-portal/public/apigateway-js-sdk/apigClient.js'
    const apigClient = fs.readFileSync(apigClientPath, 'utf8')
    const apigClientModified = apigClient
        .replace(/YOUR_API_GATEWAY_API_ID/g, apiGatewayApiId)
        .replace(/YOUR_PRIMARY_AWS_REGION/g, primaryAwsRegion)
    fs.writeFileSync(apigClientPath, apigClientModified, 'utf8')
}

function modifySwaggerFile(expressLambdaFunctionName) {
    const swaggerDefinitionPath = './lambdas/express/dev-portal-express-proxy-api.yaml'
    const swaggerDefinition = fs.readFileSync(swaggerDefinitionPath, 'utf8')
    const simpleProxyApiModified = swaggerDefinition
        .replace(/YOUR_LAMBDA_FUNCTION_NAME/g, expressLambdaFunctionName)

    fs.writeFileSync(swaggerDefinitionPath, simpleProxyApiModified, 'utf8')
}
