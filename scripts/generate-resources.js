#!/usr/bin/env node --harmony
'use strict'

// todo refactor the scripts that generate resources in package.json into code here

const AWS = require('aws-sdk')
const {Swizzle} = require('swizzle-params')
const swizzle = new Swizzle()
const {siteS3Bucket, primaryAwsRegion, cloudFormationStackName} = swizzle.stack

const StackName = cloudFormationStackName

AWS.config.update({region: primaryAwsRegion})
const cloudformation = new AWS.CloudFormation();

function getOutputValue(outputs, key) {
	return outputs.find(o => o.OutputKey === key).OutputValue
}

cloudformation.describeStacks({StackName})
	.promise()
	.then((data) => {
		const stack = data.Stacks[0]
		const outputs = stack.Outputs
		const apiGatewayApiId = getOutputValue(outputs, 'ApiId')
		const cognitoIdentityPoolId = getOutputValue(outputs, 'CognitoIdentityPoolId')
		const cognitoClientId = getOutputValue(outputs, 'CognitoUserPoolClientId')
		const cognitoUserPoolId = getOutputValue(outputs, 'CognitoUserPoolId')
		// todo this should be a resource output part of the cloud formation yaml definition
		const homepage = 'http://' + siteS3Bucket + '.s3-website-' + primaryAwsRegion + '.amazonaws.com/'
		// document param values and swizzle the config files
		swizzle.updateGeneratedParams({
			apiGatewayApiId,
			cognitoIdentityPoolId,
			cognitoClientId,
			cognitoUserPoolId,
			homepage
		})
	}).catch(console.log.bind(console))
