'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../util')

const ACCOUNT_LIST_METHODS_BY_FILTER = {
  pendingRequest: customersController.listPendingRequestAccounts,
  pendingInvite: customersController.listPendingInviteAccounts,
  admin: customersController.listAdminAccounts,
  registered: customersController.listRegisteredAccounts
}

exports.get = async (req, res) => {
  console.log('GET /accounts')

  const filter = req.query.filter
  if (!Object.keys(ACCOUNT_LIST_METHODS_BY_FILTER).includes(filter)) {
    res.status(400).json({
      message: 'Invalid value for "filter" query parameter.'
    })
    return
  }

  try {
    const accounts = await ACCOUNT_LIST_METHODS_BY_FILTER[filter]()
    res.status(200).json({ accounts })
  } catch (error) {
    res.status(500).json(util.makeErrorResponse(error))
  }
}

exports.post = async (req, res) => {
  const { targetEmailAddress } = req.body
  if (
    !(typeof targetEmailAddress === 'string' && targetEmailAddress.length > 0)
  ) {
    res
      .status(400)
      .json({ message: 'Invalid value for "targetEmailAddress" parameter.' })
    return
  }

  try {
    const inviterUserId = util.getCognitoUserId(req)
    const preLoginAccount = await customersController.createAccountInvite({
      targetEmailAddress,
      inviterUserId
    })
    res.status(200).json(preLoginAccount)
  } catch (error) {
    console.log('Error:', error)
    res.status(500).json(util.makeErrorResponse(error))
  }
}

exports.delete = async (req, res) => {
  const userId = req.params.userId
  if (!(typeof userId === 'string' && userId.length > 0)) {
    res
      .status(400)
      .json({ message: 'Invalid value for "userId" URL parameter.' })
    return
  }

  try {
    await customersController.deleteAccountByUserId(userId)
    res.status(200).json({})
  } catch (error) {
    console.log('Error:', error)
    res.status(500).json(util.makeErrorResponse(error))
  }
}
