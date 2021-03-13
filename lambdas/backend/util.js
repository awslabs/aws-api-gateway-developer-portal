'use strict'

const AWS = require('aws-sdk')
const qs = require('qs')
const { getEnv } = require('dev-portal-common/get-env')

exports.Custom = function (response) {
  this.response = response
}

function serializeBody (event, body) {
  if (body == null) {
    if (event.httpMethod !== 'GET') return ''
    body = {}
  }
  const contentType = event.headers['content-type']
  const valueToSerialize = typeof body === 'string' ? { message: body } : body

  if (contentType != null) {
    const semicolon = contentType.indexOf(';')
    const mimeType = semicolon < 0 ? contentType : contentType.slice(0, semicolon)

    switch (mimeType.trim()) {
      case 'application/x-www-form-urlencoded': return qs.stringify(valueToSerialize)
      case 'application/json': body = valueToSerialize; break
    }
  }

  if (typeof body === 'string') return body
  return JSON.stringify(valueToSerialize)
}

exports.serializeCustom = (event, status, body, extra = {}) => {
  const serialized = serializeBody(event, body)
  const result = { statusCode: status, body: serialized }
  Object.assign(result, extra)
  if (event.headers['content-type'] && serialized) {
    result.headers = { ...result.headers, 'response-type': event.headers['content-type'] }
  }
  return result
}

exports.custom = (event, status, response, extra = {}) => {
  throw new exports.Custom(exports.serializeCustom(event, status, response, extra))
}

exports.abort = (event, status, message) =>
  exports.custom(event, status, { message })

const bodySizeLimit = 10 * 1024 * 1024 // 10 megabytes

exports.getBody = event => {
  // assert charset is supported
  const contentType = event.headers['content-type']

  if (contentType == null) {
    throw new exports.Custom({
      statusCode: 415,
      body: 'A content type is required',
      contentType: 'text/plain'
    })
  }

  const [mimeType, ...params] = contentType.split(';')

  if (params.every(param => !/^\s*charset\s*=\s*utf-8\s*$/i.test(param))) {
    throw new exports.Custom({
      statusCode: 415,
      body: 'Invalid character set in content type',
      contentType: 'text/plain'
    })
  }

  let body = event.body

  const byteLength = Buffer.byteLength(body, event.isBase64Encoded ? 'base64' : 'utf-8')
  if (byteLength > bodySizeLimit) {
    return exports.custom(event, 413, {
      message: 'request entity too large',
      length: byteLength,
      expected: bodySizeLimit,
      limit: bodySizeLimit
    })
  }

  if (event.isBase64Encoded) {
    try {
      body = Buffer.from(body, 'base64').toString('utf-8')
    } catch {
      return exports.abort(event, 400, 'Invalid Base64 received')
    }
  }

  switch (mimeType.trim()) {
    case 'application/json':
      try {
        return JSON.parse(body)
      } catch {
        return exports.abort(event, 400, 'Invalid body syntax')
      }
    case 'application/x-www-form-urlencoded':
      try {
        return qs.parse(body)
      } catch {
        return exports.abort(event, 400, 'Invalid URL-encoded text received')
      }
    default:
      return exports.abort(event, 415, 'Invalid character set in content type')
  }
}

exports.makeErrorResponse = (error, message = null) => {
  const response = { message: message === null ? error.message : message }
  if (getEnv('DevelopmentMode', 'false') === 'true' || getEnv('LocalDevelopmentMode', 'false') === 'true') {
    response.stack = error.stack
  }
  return response
}

exports.getCognitoIdentityId = event => {
  return event.requestContext.identity.cognitoIdentityId
}

exports.getCognitoIdentitySub = event => {
  const provider = event.requestContext.identity.cognitoAuthenticationProvider
  if (provider == null) return undefined
  const index = provider.indexOf(':CognitoSignIn:')
  if (index < 0) return undefined
  return provider.slice(index + 15)
}

// strategy borrowed from: https://serverless-stack.com/chapters/mapping-cognito-identity-id-and-user-pool-id.html
exports.getCognitoUserId = event => {
  const authProvider = event.requestContext.identity.cognitoAuthenticationProvider

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
// exports.getCognitoKey = event => {
//   return event.requestContext.authorizer.claims.iss + ' ' + getCognitoUsername(req)
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

        return {
          apiGateway: [],
          generic: {}
        }
      }

      console.error('error:', error)

      throw error
    })
}
