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

exports.getCognitoIdentitySub = req => {
  const provider = req.apiGateway.event.requestContext.identity.cognitoAuthenticationProvider
  if (provider == null) return undefined
  const index = provider.indexOf(':CognitoSignIn:')
  if (index < 0) return undefined
  return provider.slice(index + 15)
}

// strategy borrowed from: https://serverless-stack.com/chapters/mapping-cognito-identity-id-and-user-pool-id.html
exports.getCognitoUserId = req => {
  const authProvider = req.apiGateway.event.requestContext.identity.cognitoAuthenticationProvider

  // Cognito authentication provider looks like:
  // cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxxxxx,cognito-idp.us-east-1.amazonaws.com/us-east-1_aaaaaaaaa:CognitoSignIn:qqqqqqqq-1111-2222-3333-rrrrrrrrrrrr
  // Where us-east-1_aaaaaaaaa is the User Pool id
  // And qqqqqqqq-1111-2222-3333-rrrrrrrrrrrr is the User Pool User Id
  const parts = authProvider.split(':')
  // const userPoolIdParts = parts[parts.length - 3].split('/')
  // const userPoolId = userPoolIdParts[userPoolIdParts.length - 1]
  const userPoolUserId = parts[parts.length - 1]

  return userPoolUserId
}

// this returns the key we use in the CustomersTable. It's constructed from the issuer field and the username when we
// allow multiple identity providers, this will allow google's example@example.com to be distinguishable from
// Cognito's or Facebook's example@example.com
// exports.getCognitoKey = req => {
//   return req.apiGateway.event.requestContext.authorizer.claims.iss + ' ' + getCognitoUsername(req)
// }

exports.getUsagePlanFromCatalog = (usagePlanId, catalog) => {
  for (const usagePlan of catalog.apiGateway) {
    if (usagePlan.id === usagePlanId) return usagePlan
  }

  return null
}

exports.findApiInCatalog = (restApiId, stageName, catalog) => {
  for (const usagePlan of catalog.apiGateway) {
    for (const api of usagePlan.apis) {
      if (api.apiId === restApiId && api.apiStage === stageName) return api
    }
  }

  for (const api of Object.values(catalog.generic)) {
    if (api.apiId === restApiId && api.apiStage === stageName) return api
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
    Key: 'catalog.json',
    ExpectedBucketOwner: process.env.SourceAccount
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

        return {
          apiGateway: [],
          generic: {}
        }
      }

      console.error('error:', error)

      throw error
    })
}
