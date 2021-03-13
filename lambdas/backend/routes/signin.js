'use strict'

const customersController = require('dev-portal-common/customers-controller')
const { promisify2 } = require('dev-portal-common/promisify2')
const util = require('../util')

exports.post = async (event) => {
  const cognitoIdentityId = util.getCognitoIdentityId(event)
  const cognitoUserId = util.getCognitoUserId(event)
  console.log(`POST /signin for identity ID [${cognitoIdentityId}]`)

  // We want to uphold the invariant that "if the logged-in account has a
  // CustomersTable item, then its Id, UserPoolId, and ApiKeyId attributes
  // are set correctly".
  //
  // The ApiKeyId attribute of the CustomersTable item must already exist if
  // the item itself exists; if not, it will be updated later by
  // `ensureApiKeyForCustomer`. So we can safely pass a dummy here while
  // upholding the invariant.
  await promisify2(customersController.ensureCustomerItem)(
    cognitoIdentityId,
    cognitoUserId,
    'NO_API_KEY'
  )
  await customersController.ensureApiKeyForCustomer({
    userId: cognitoUserId,
    identityId: cognitoIdentityId
  })
}
