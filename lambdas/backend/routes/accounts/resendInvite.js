'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../../util')

exports.put = async (req, res) => {
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
    // const inviterUserId = util.getCognitoUserId(req)
    await customersController.resendAccountInvite({ targetEmailAddress })
    res.status(200).json({})
  } catch (error) {
    console.log('Error:', error)
    res.status(500).json(util.makeErrorResponse(error))
  }
}
