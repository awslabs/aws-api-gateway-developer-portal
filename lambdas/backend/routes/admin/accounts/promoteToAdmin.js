'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../../../util')

exports.put = async (event, userId) => {
  const promoterUserId = util.getCognitoUserId(event)
  await customersController.addAccountToAdminsGroup({
    targetUserId: userId,
    promoterUserSub: util.getCognitoIdentitySub(event),
    promoterUserId
  })
}
