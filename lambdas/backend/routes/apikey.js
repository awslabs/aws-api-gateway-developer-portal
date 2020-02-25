'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../util')

exports.get = (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`GET /apikey for Cognito ID: ${cognitoIdentityId}`)

  function errFunc (data) {
    console.log(`error: ${data}`)
    res.status(500).json(data)
  }

  customersController.getApiKeyForCustomer(cognitoIdentityId, errFunc, (data) => {
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
  })
}
