'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../util')

exports.get = async (event) => {
  const cognitoIdentityId = util.getCognitoIdentityId(event)
  console.log(`GET /subscriptions for Cognito ID: ${cognitoIdentityId}`)

  return new Promise((resolve, reject) => {
    customersController.getUsagePlansForCustomer(cognitoIdentityId, reject, resolve)
  })
}

exports.put = async (event, usagePlanId) => {
  const cognitoIdentityId = util.getCognitoIdentityId(event)
  console.log(`PUT /subscriptions for Cognito ID: ${cognitoIdentityId}`)

  const catalog = await util.catalog()
  const catalogUsagePlan = util.getUsagePlanFromCatalog(usagePlanId, catalog)
  // const apiGatewayUsagePlan = await apigateway.getUsagePlan({ usagePlanId }).promise()
  console.log(`catalogUsagePlan: ${JSON.stringify(catalogUsagePlan, null, 2)}`)

  // the usage plan doesn't exist
  // the usage plan exists, but 0 of its apis are visible
  if (!catalogUsagePlan) return util.abort(event, 404, 'Invalid Usage Plan ID')
  if (!catalogUsagePlan.apis.length) return util.abort(event, 404, 'Invalid Usage Plan ID')
  // allow subscription if (the usage plan exists, at least 1 of its apis are visible)
  return util.custom(event, 201, await new Promise((resolve, reject) => {
    customersController.subscribe(cognitoIdentityId, usagePlanId, reject, resolve)
  }))
}

exports.delete = async (event, usagePlanId) => {
  const cognitoIdentityId = util.getCognitoIdentityId(event)
  console.log(`DELETE /subscriptions for Cognito ID: ${cognitoIdentityId}`)

  const catalog = await util.catalog()
  const usagePlan = util.getUsagePlanFromCatalog(usagePlanId, catalog)

  if (!usagePlan || !usagePlan.apis.length) return util.abort(event, 404, 'Invalid Usage Plan ID')
  return new Promise((resolve, reject) => {
    customersController.unsubscribe(cognitoIdentityId, usagePlanId, reject, resolve)
  })
}
