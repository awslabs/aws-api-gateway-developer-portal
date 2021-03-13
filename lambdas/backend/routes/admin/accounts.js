'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../../util')

exports.get = async (event) => {
  console.log('GET /admin/accounts')

  let accounts

  switch (event.queryStringParameters.filter) {
    // Not implemented yet
    // case 'pendingRequest': accounts = await customersController.listPendingRequestAccounts(); break
    case 'pendingInvite': accounts = await customersController.listPendingInviteAccounts(); break
    case 'admin': accounts = await customersController.listAdminAccounts(); break
    case 'registered': accounts = await customersController.listRegisteredAccounts(); break
    default:
      return util.abort(event, 400, {
        message: 'Invalid value for "filter" query parameter.'
      })
  }

  return { accounts }
}

exports.post = async (event) => {
  const inviterUserId = util.getCognitoIdentityId(event)
  console.log(`POST /admin/accounts for Cognito ID: ${inviterUserId}`)

  console.log(JSON.stringify(event, null, 2))

  const { targetEmailAddress } = util.getBody(event)
  if (typeof targetEmailAddress !== 'string' || targetEmailAddress === '') {
    return util.abort(event, 400, 'Invalid value for "targetEmailAddress" parameter.')
  }

  return customersController.createAccountInvite({
    targetEmailAddress,
    inviterUserSub: util.getCognitoIdentitySub(event),
    inviterUserId
  })
}

exports.delete = async (event, userId) => {
  console.log('DELETE /admin/accounts/:userId')

  if (typeof userId !== 'string' || userId === '') {
    return util.abort(event, 400, 'Invalid value for "userId" URL parameter.')
  }

  if (util.getCognitoUserId(event) === userId) {
    return util.abort(event, 400, 'Invalid value for "userId" URL parameter: cannot delete yourself.')
  }

  await customersController.deleteAccountByUserId(userId)
}
