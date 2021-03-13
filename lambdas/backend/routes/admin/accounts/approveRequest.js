'use strict'

const customersController = require('dev-portal-common/customers-controller')

exports.put = async (event, userId) => {
  await customersController.approveAccountPendingRequest(userId)
}
