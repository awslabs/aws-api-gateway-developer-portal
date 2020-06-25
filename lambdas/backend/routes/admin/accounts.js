'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../../util')

exports.get = async (req, res) => {
  console.log('GET /admin/accounts')

  let accounts

  switch (req.query.filter) {
    // Not implemented yet
    // case 'pendingRequest': accounts = await customersController.listPendingRequestAccounts(); break
    case 'pendingInvite': accounts = await customersController.listPendingInviteAccounts(); break
    case 'admin': accounts = await customersController.listAdminAccounts(); break
    case 'registered': accounts = await customersController.listRegisteredAccounts(); break
    default:
      res.status(400).json({
        message: 'Invalid value for "filter" query parameter.'
      })
      return
  }

  res.status(200).json({ accounts })
}

exports.post = async (req, res) => {
  const inviterUserId = util.getCognitoIdentityId(req)
  console.log(`POST /admin/accounts for Cognito ID: ${inviterUserId}`)

  console.log(JSON.stringify(req.apiGateway.event, null, 2))

  const { targetEmailAddress } = req.body
  if (typeof targetEmailAddress !== 'string' || targetEmailAddress === '') {
    res.status(400).json({ message: 'Invalid value for "targetEmailAddress" parameter.' })
    return
  }

  const preLoginAccount = await customersController.createAccountInvite({
    targetEmailAddress,
    inviterUserSub: util.getCognitoIdentitySub(req),
    inviterUserId
  })
  res.status(200).json(preLoginAccount)
}

exports.delete = async (req, res) => {
  console.log('DELETE /admin/accounts/:userId')

  const userId = req.params.userId
  if (typeof userId !== 'string' || userId === '') {
    res.status(400).json({ message: 'Invalid value for "userId" URL parameter.' })
    return
  }

  if (util.getCognitoUserId(req) === userId) {
    res.status(400).json({ message: 'Invalid value for "userId" URL parameter: cannot delete yourself.' })
    return
  }

  await customersController.deleteAccountByUserId(userId)
  res.status(200).json({})
}
