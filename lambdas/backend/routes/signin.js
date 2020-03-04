'use strict'

const customersController = require('dev-portal-common/customers-controller')
const { promisify2 } = require('dev-portal-common/promisify2')
const util = require('../util')

// strategy borrowed from: https://serverless-stack.com/chapters/mapping-cognito-identity-id-and-user-pool-id.html
function getCognitoUserId (req) {
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
// function getCognitoKey (req) {
//   return req.apiGateway.event.requestContext.authorizer.claims.iss + ' ' + getCognitoUsername(req)
// }

exports.post = async (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  const cognitoUserId = getCognitoUserId(req)
  console.log(`POST /signin for identity ID [${cognitoIdentityId}]`)

  try {
    // We want to uphold the invariant that "if the logged-in account has a
    // CustomersTable item, then its Id, UserPoolId, and ApiKeyId attributes
    // are set correctly".
    //
    // The ApiKeyId attribute of the CustomersTable item must already exist if
    // the item itself exists; if not, it will be updated later by
    // `ensureApiKeyForCustomer`. So we can safely pass a dummy here while
    // upholding the invariant.
    await promisify2(customersController.ensureCustomerItem)(
      cognitoIdentityId,
      cognitoUserId,
      'NO_API_KEY'
    )
    await customersController.ensureApiKeyForCustomer({
      userId: cognitoUserId,
      identityId: cognitoIdentityId
    })
  } catch (error) {
    console.log(`error: ${error}`)
    res.status(500).json(error)
    return
  }

  res.status(200).json({})
}
