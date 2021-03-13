'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../../../util')

exports.put = async (event) => {
  const { targetEmailAddress } = util.getBody(event)
  if (
    !(typeof targetEmailAddress === 'string' && targetEmailAddress.length > 0)
  ) {
    return util.abort(event, 400, 'Invalid value for "targetEmailAddress" parameter.')
  }

  // const inviterUserId = util.getCognitoUserId(req.apiGateway.event)
  await customersController.resendAccountInvite({ targetEmailAddress })
}
