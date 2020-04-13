'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../util')

exports.get = async (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`GET /apikey for Cognito ID: ${cognitoIdentityId}`)

  const data = await new Promise((resolve, reject) => {
    customersController.getApiKeyForCustomer(cognitoIdentityId, reject, resolve)
  })

  if (data.items.length === 0) {
    res.status(404).json({ error: 'No API Key for customer' })
  } else {
    const item = data.items[0]
    const key = {
      id: item.id,
      value: item.value
    }
    res.status(200).json(key)
  }
}
