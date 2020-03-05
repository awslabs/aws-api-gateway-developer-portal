'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../../util')

exports.get = (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`GET /usage for Cognito ID: ${cognitoIdentityId}`)
  const usagePlanId = req.params.usagePlanId

  function errFunc (data) {
    console.log(`error: ${data}`)
    res.status(500).json(data)
  }

  util.catalog()
    .then(catalog => util.getUsagePlanFromCatalog(usagePlanId, catalog))
    .then(usagePlan => {
      const isUsagePlanInCatalog = Boolean(usagePlan)

      // could error here if customer is not subscribed to usage plan, or save an extra request by just showing 0 usage
      if (!isUsagePlanInCatalog) {
        res.status(404).json({ error: 'Invalid Usage Plan ID' })
      } else {
        customersController.getApiKeyForCustomer(cognitoIdentityId, errFunc, (data) => {
          const keyId = data.items[0].id

          const params = {
            endDate: req.query.end,
            startDate: req.query.start,
            usagePlanId,
            keyId,
            limit: 1000
          }

          util.apigateway.getUsage(params, (err, usageData) => {
            if (err) {
              console.log(`get usage err ${JSON.stringify(err)}`)
              errFunc(err)
            } else {
              console.log(`get usage data ${JSON.stringify(usageData)}`)
              res.status(200).json(usageData)
            }
          })
        })
      }
    })
}
