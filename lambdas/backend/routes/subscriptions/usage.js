'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../../util')

exports.get = async (event, usagePlanId) => {
  const cognitoIdentityId = util.getCognitoIdentityId(event)
  console.log(`GET /subscriptions/:usagePlanId/usage for Cognito ID: ${cognitoIdentityId}`)

  const catalog = await util.catalog()
  const usagePlan = util.getUsagePlanFromCatalog(usagePlanId, catalog)

  // could error here if customer is not subscribed to usage plan, or save an extra request by just showing 0 usage
  if (!usagePlan) return util.abort(event, 404, 'Invalid Usage Plan ID')

  const data = await customersController.getApiKeyForCustomer(cognitoIdentityId)

  return util.apigateway.getUsage({
    endDate: event.queryStringParameters.end,
    startDate: event.queryStringParameters.start,
    usagePlanId,
    keyId: data.items[0].id,
    limit: 1000
  }).promise()
}
