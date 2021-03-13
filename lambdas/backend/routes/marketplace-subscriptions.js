'use strict'

// FIXME: Marketplace support is currently broken

const AWS = require('aws-sdk')
const customersController = require('dev-portal-common/customers-controller')
const util = require('../util')

const marketplace = new AWS.MarketplaceMetering()

exports.put = async (event, usagePlanId) => {
  const cognitoIdentityId = util.getCognitoIdentityId(event)
  console.log(`PUT /marketplace-subscriptions/:usagePlanId for Cognito ID: ${cognitoIdentityId}`)

  const marketplaceToken = util.getBody(event).token
  console.log(`Marketplace token: ${marketplaceToken} usage plan id: ${usagePlanId}`)
  console.log(`cognito id: ${cognitoIdentityId}`)

  // call MMS to crack token into marketpltestSingleAccountId_apiKeysConfigace customer ID and product code
  let data

  try {
    data = await marketplace.resolveCustomer({ RegistrationToken: marketplaceToken }).promise()
  } catch (err) {
    console.log(`marketplace error: ${JSON.stringify(err)}`)
    return util.abort(event, 400, err.message)
  }

  console.log(`marketplace data: ${JSON.stringify(data)}`)

  // persist the marketplaceCustomerId in DDB
  // this is used when the subscription listener receives the subscribe notification
  await customersController.updateCustomerMarketplaceId(cognitoIdentityId, data.CustomerIdentifier)

  return customersController.subscribe(cognitoIdentityId, usagePlanId)
}
