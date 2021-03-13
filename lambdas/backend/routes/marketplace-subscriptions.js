'use strict'

// FIXME: Marketplace support is currently broken

const AWS = require('aws-sdk')
const customersController = require('dev-portal-common/customers-controller')
const util = require('../util')

exports.put = (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`PUT /marketplace-subscriptions/:usagePlanId for Cognito ID: ${cognitoIdentityId}`)

  const marketplaceToken = req.body.token
  const usagePlanId = req.params.usagePlanId
  console.log(`Marketplace token: ${marketplaceToken} usage plan id: ${usagePlanId}`)
  console.log(`cognito id: ${cognitoIdentityId}`)

  function error (data) {
    console.log(`error: ${data}`)
    res.status(500).json(data)
  }

  function success (data) {
    res.status(200).json(data)
  }

  function subscribeCustomerToUsagePlan (data) {
    customersController.subscribe(cognitoIdentityId, usagePlanId, error, success)
  }

  const marketplace = new AWS.MarketplaceMetering()

  const params = {
    RegistrationToken: marketplaceToken
  }

  // call MMS to crack token into marketpltestSingleAccountId_apiKeysConfigace customer ID and product code
  marketplace.resolveCustomer(params, (err, data) => {
    if (err) {
      console.log(`marketplace error: ${JSON.stringify(err)}`)
      res.status(400).json(err.message)
    } else {
      console.log(`marketplace data: ${JSON.stringify(data)}`)

      // persist the marketplaceCustomerId in DDB
      // this is used when the subscription listener receives the subscribe notification
      const marketplaceCustomerId = data.CustomerIdentifier
      customersController.updateCustomerMarketplaceId(cognitoIdentityId, marketplaceCustomerId, error, subscribeCustomerToUsagePlan)
    }
  })
}
