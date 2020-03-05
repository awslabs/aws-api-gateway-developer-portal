'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../util')

exports.get = (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`GET /subscriptions for Cognito ID: ${cognitoIdentityId}`)

  function errFunc (data) {
    console.log(`error: ${data}`)
    res.status(500).json(data)
  }

  customersController.getUsagePlansForCustomer(cognitoIdentityId, errFunc, (data) => {
    res.status(200).json(data.items)
  })
}

exports.put = (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`PUT /subscriptions for Cognito ID: ${cognitoIdentityId}`)
  const usagePlanId = req.params.usagePlanId

  util.catalog()
    .then(catalog => util.getUsagePlanFromCatalog(usagePlanId, catalog))
    .then(async (catalogUsagePlan) => {
      const isUsagePlanInCatalog = Boolean(catalogUsagePlan)
      // const apiGatewayUsagePlan = await apigateway.getUsagePlan({ usagePlanId }).promise()

      function error (data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
      }

      function success (data) {
        res.status(201).json(data)
      }

      // the usage plan doesn't exist
      if (!isUsagePlanInCatalog) {
        res.status(404).json({ error: 'Invalid Usage Plan ID' })
        // the usage plan exists, but 0 of its apis are visible
      } else if (!catalogUsagePlan.apis.length) {
        res.status(404).json({ error: 'Invalid Usage Plan ID' })
        // allow subscription if (the usage plan exists, at least 1 of its apis are visible)
      } else {
        customersController.subscribe(cognitoIdentityId, usagePlanId, error, success)
      }
    })
}

exports.delete = (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`DELETE /subscriptions for Cognito ID: ${cognitoIdentityId}`)
  const usagePlanId = req.params.usagePlanId

  function error (data) {
    console.log(`error: ${data}`)
    res.status(500).json(data)
  }

  function success (data) {
    res.status(200).json(data)
  }

  util.catalog()
    .then(catalog => util.getUsagePlanFromCatalog(usagePlanId, catalog))
    .then((usagePlan) => {
      const isUsagePlanInCatalog = Boolean(usagePlan)

      if (!isUsagePlanInCatalog) {
        res.status(404).json({ error: 'Invalid Usage Plan ID' })
      } else {
        customersController.unsubscribe(cognitoIdentityId, usagePlanId, error, success)
      }
    })
}
