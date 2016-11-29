'use strict'

const https = require('https')
const url = require('url')
const AWS = require('aws-sdk')

const cognitoIdentityPoolService = new AWS.CognitoIdentity()
const cognitoUserPoolService = new AWS.CognitoIdentityServiceProvider()
const constants = {
	SUCCESS: 'SUCCESS',
	FAILED: 'FAILED',
	UPDATE: 'Update',
	CREATE: 'Create',
	DELETE: 'Delete'
}

exports.handler = (event, context, callback) => {
	console.log(event)

	const requestType = event.RequestType
	const resourceOptions = requestType === constants.DELETE ? {} : event.ResourceProperties.Options

	switch (event.LogicalResourceId) {
		case 'CognitoIdentityPool':
			return handleIdentityPool()
		case 'CognitoIdentityPoolRoles':
			return handleIdentityPoolRoles()
		case 'CognitoUserPool':
			return handleUserPool()
		case 'CognitoUserPoolClient':
			return handleUserPoolClient()
		default:
			return sendCloudFormationResponse(constants.FAILED, { message: `Invalid LogicalResourceId: ${event.LogicalResourceId}` })
	}

	function handleIdentityPool() {
		if (isDeleteOrUpdate()) resourceOptions.IdentityPoolId = event.PhysicalResourceId

		if (requestType !== constants.DELETE) {
			resourceOptions.AllowUnauthenticatedIdentities = convertToBoolean(resourceOptions.AllowUnauthenticatedIdentities)
		}

		return cognitoIdentityPoolService
			[`${requestType.toLowerCase()}IdentityPool`](resourceOptions)
			.promise()
			.then(data => sendCloudFormationResponse(constants.SUCCESS, data, data.IdentityPoolId))
			.catch(e => sendCloudFormationResponse(constants.FAILED, e))
	}

	function handleIdentityPoolRoles() {
		if (requestType === constants.DELETE) return sendCloudFormationResponse(constants.SUCCESS)

		return cognitoIdentityPoolService
			.setIdentityPoolRoles(resourceOptions)
			.promise()
			.then(data => sendCloudFormationResponse(constants.SUCCESS, data))
			.catch(e => sendCloudFormationResponse(constants.FAILED, e))
	}

	function handleUserPool() {
		if (isDeleteOrUpdate()) resourceOptions.UserPoolId = event.PhysicalResourceId

		if (requestType === constants.UPDATE) {
			delete resourceOptions.PoolName
			delete resourceOptions.Schema
			delete resourceOptions.AutoVerifiedAttributes
			delete resourceOptions.AliasAttributes
		}

		if(requestType !== constants.DELETE && Array.isArray(resourceOptions.Schema)) {
			resourceOptions.Schema = resourceOptions.Schema.map(schema => {
				schema.Required = convertToBoolean(schema.Required)

				return schema
			})
		}

		return cognitoUserPoolService[`${requestType.toLowerCase()}UserPool`](resourceOptions)
			.promise()
			.then(data => {
				// CloudFormation alows only a limited response size; SchemaAttributes is the main offender
				if (data.UserPool) delete data.UserPool.SchemaAttributes
				sendCloudFormationResponse(constants.SUCCESS, data.UserPool, data.UserPool && data.UserPool.Id)
			})
			.catch(e => sendCloudFormationResponse(constants.FAILED, e))
	}

	function handleUserPoolClient(){
		if (isDeleteOrUpdate()) {
			resourceOptions.ClientId = event.PhysicalResourceId
			resourceOptions.UserPoolId = event.ResourceProperties.Options.UserPoolId
		}

		if (requestType !== constants.DELETE) {
			resourceOptions.GenerateSecret = convertToBoolean(resourceOptions.GenerateSecret)
		}

		return cognitoUserPoolService[`${requestType.toLowerCase()}UserPoolClient`](resourceOptions)
			.promise()
			.then(data => sendCloudFormationResponse(constants.SUCCESS, data.UserPoolClient, data.UserPoolClient && data.UserPoolClient.ClientId))
			.catch(e => sendCloudFormationResponse(constants.FAILED, e))
	}

	function isDeleteOrUpdate() {
		return requestType === constants.DELETE || requestType === constants.UPDATE
	}

	function convertToBoolean(b) {
		if (b === 'true') return true
		if (b === 'false') return false

		return b
	}

	function sendCloudFormationResponse(responseStatus, responseData, physicalResourceId) {
		const responseBody = JSON.stringify({
			Status: responseStatus,
			Reason: `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
			PhysicalResourceId: physicalResourceId || context.logStreamName,
			StackId: event.StackId,
			RequestId: event.RequestId,
			LogicalResourceId: event.LogicalResourceId,
			Data: responseData
		})

		console.log(`Response body:
			${responseBody}`)

		const parsedUrl = url.parse(event.ResponseURL)
		const requestOptions = {
			hostname: parsedUrl.hostname,
			port: 443,
			path: parsedUrl.path,
			method: 'PUT',
			headers: {
				'content-type': '',
				'content-length': responseBody.length
			}
		}

		return new Promise((resolve, reject) => {
				const request = https.request(requestOptions, resolve)

				request.on('error', e => reject(`http request error: ${e}`))
				request.write(responseBody)
				request.end()
			})
			.then(() => callback(responseStatus === constants.FAILED ? responseStatus : null, responseData))
			.catch(callback)
	}
}
