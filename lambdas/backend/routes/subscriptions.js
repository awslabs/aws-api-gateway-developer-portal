'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../util')

exports.get = async (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`GET /subscriptions for Cognito ID: ${cognitoIdentityId}`)

  const data = await new Promise((resolve, reject) => {
    customersController.getUsagePlansForCustomer(cognitoIdentityId, reject, resolve)
  })

  res.status(200).json(data.items)
}

exports.put = async (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`PUT /subscriptions for Cognito ID: ${cognitoIdentityId}`)
  const usagePlanId = req.params.usagePlanId

  const catalog = await util.catalog()
  const catalogUsagePlan = util.getUsagePlanFromCatalog(usagePlanId, catalog)
  // const apiGatewayUsagePlan = await apigateway.getUsagePlan({ usagePlanId }).promise()
  console.log(`catalogUsagePlan: ${JSON.stringify(catalogUsagePlan, null, 2)}`)

  // the usage plan doesn't exist
  if (!catalogUsagePlan) {
    res.status(404).json({ error: 'Invalid Usage Plan ID' })
    // the usage plan exists, but 0 of its apis are visible
  } else if (!catalogUsagePlan.apis.length) {
    res.status(404).json({ error: 'Invalid Usage Plan ID' })
    // allow subscription if (the usage plan exists, at least 1 of its apis are visible)
  } else {
    const data = await new Promise((resolve, reject) => {
      customersController.subscribe(cognitoIdentityId, usagePlanId, reject, resolve)
    })
    res.status(201).json(data)
  }
}

exports.delete = async (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`DELETE /subscriptions for Cognito ID: ${cognitoIdentityId}`)
  const usagePlanId = req.params.usagePlanId

  const catalog = await util.catalog()
  const usagePlan = util.getUsagePlanFromCatalog(usagePlanId, catalog)

  if (!usagePlan || !usagePlan.apis.length) {
    res.status(404).json({ error: 'Invalid Usage Plan ID' })
  } else {
    const data = await new Promise((resolve, reject) => {
      customersController.unsubscribe(cognitoIdentityId, usagePlanId, reject, resolve)
    })
    res.status(200).json(data)
  }
}
