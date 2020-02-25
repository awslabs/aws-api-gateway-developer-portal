'use strict'

const customersController = require('dev-portal-common/customers-controller')
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

exports.post = function postSignIn (req, res) {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`POST /signin for Cognito ID: ${cognitoIdentityId}`)

  const cognitoUserId = getCognitoUserId(req)

  function errFunc (data) {
    console.log(`error: ${data}`)
    res.status(500).json(data)
  }

  // ensure an API Key exists for this customer and that the Cognito identity and API Key Id are tracked in DDB
  customersController.getApiKeyForCustomer(cognitoIdentityId, errFunc, (data) => {
    console.log(`Get Api Key data ${JSON.stringify(data)}`)

    if (data.items.length === 0) {
      console.log(`No API Key found for customer ${cognitoIdentityId}`)

      customersController.createApiKey(cognitoIdentityId, cognitoUserId, errFunc, (createData) => {
        console.log(`Create API Key data: ${JSON.stringify(createData, null, 4)}`)
        const keyId = createData.id

        console.log(`Got key ID ${keyId}`)

        customersController.ensureCustomerItem(cognitoIdentityId, cognitoUserId, keyId, errFunc)
          .then(() => res.status(200).json({}))
      })
    } else {
      const keyId = data.items[0].id

      customersController.ensureCustomerItem(cognitoIdentityId, cognitoUserId, keyId, errFunc)
        .then(() => res.status(200).json({}))
    }
  })
}
