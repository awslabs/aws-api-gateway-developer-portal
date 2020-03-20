'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../../util')

exports.get = async (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`GET /subscriptions/:usagePlanId/usage for Cognito ID: ${cognitoIdentityId}`)
  const usagePlanId = req.params.usagePlanId

  const catalog = await util.catalog()
  const usagePlan = util.getUsagePlanFromCatalog(usagePlanId, catalog)

  // could error here if customer is not subscribed to usage plan, or save an extra request by just showing 0 usage
  if (!usagePlan) {
    res.status(404).json({ error: 'Invalid Usage Plan ID' })
  } else {
    const data = await new Promise((resolve, reject) => {
      customersController.getApiKeyForCustomer(cognitoIdentityId, reject, resolve)
    })
    const keyId = data.items[0].id

    const params = {
      endDate: req.query.end,
      startDate: req.query.start,
      usagePlanId,
      keyId,
      limit: 1000
    }

    const usageData = await new Promise((resolve, reject) => {
      util.apigateway.getUsage(params, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
    res.status(200).json(usageData)
  }
}
