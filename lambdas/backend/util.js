'use strict'

const AWS = require('aws-sdk')
const { getEnv } = require('dev-portal-common/get-env')

exports.makeErrorResponse = (error, message = null) => {
  const response = { message: message === null ? error.message : message }
  if (getEnv('DevelopmentMode', 'false') === 'true' || getEnv('LocalDevelopmentMode', 'false') === 'true') {
    response.stack = error.stack
  }
  return response
}

exports.getCognitoIdentityId = req => {
  return req.apiGateway.event.requestContext.identity.cognitoIdentityId
}

// this returns the key we use in the CustomersTable. It's constructed from the issuer field and the username when we
// allow multiple identity providers, this will allow google's example@example.com to be distinguishable from
// Cognito's or Facebook's example@example.com
// exports.getCognitoKey = req => {
//   return req.apiGateway.event.requestContext.authorizer.claims.iss + ' ' + getCognitoUsername(req)
// }

exports.getUsagePlanFromCatalog = (usagePlanId, catalog) => {
  for (const usagePlan of catalog.apiGateway) {
    if (usagePlan.id === usagePlanId) return usagePlanId
  }

  return null
}

exports.findApiInCatalog = (restApiId, stageName, catalog) => {
  for (const usagePlan of catalog.apiGateway) {
    for (const api of usagePlan.apis) {
      if (api.apiId === restApiId && api.stage === stageName) return api
    }
  }

  for (const api of Object.values(catalog.generic)) {
    if (api.apiId === restApiId && api.stage === stageName) return api
  }

  return null
}

exports.s3 = new AWS.S3()
exports.apigateway = new AWS.APIGateway()
exports.lambda = new AWS.Lambda()

exports.catalog = () => {
  // TODO: This was previously cached, and could be again, except that there's no mechanism to cache-bust the lambda
  // function when the user updates the catalog. This led to confusing behavior, so I removed it.
  const params = {
    Bucket: process.env.StaticBucketName,
    Key: 'catalog.json'
  }

  console.log(`params: ${JSON.stringify(params, null, 4)}`)

  return exports.s3.getObject(params).promise()
    .then((catalog) => {
      const cleanCatalog = JSON.parse(catalog.Body.toString())
      console.log(`catalog: ${JSON.stringify(cleanCatalog, null, 4)}`)
      return cleanCatalog
    })
    .catch((error) => {
      // don't break if there's no catalog file
      if (error.code === 'NoSuchKey') {
        console.error('error: No catalog.json file found. Please upload an api definition to `catalog/`.')

        return []
      }

      console.error('error:', error)

      throw error
    })
}
