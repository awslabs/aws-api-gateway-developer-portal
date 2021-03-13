'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../util')

exports.get = async (event) => {
  const cognitoIdentityId = util.getCognitoIdentityId(event)
  console.log(`GET /apikey for Cognito ID: ${cognitoIdentityId}`)

  const data = await customersController.getApiKeyForCustomer(cognitoIdentityId)

  if (data.items.length === 0) {
    return {
      statusCode: 404,
      body: 'No API key for customer'
    }
  } else {
    const { id, value } = data.items[0]
    return {
      statusCode: 200,
      body: { id, value }
    }
  }
}
