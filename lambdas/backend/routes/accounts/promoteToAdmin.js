'use strict'

const customersController = require('dev-portal-common/customers-controller')
const util = require('../../util')

exports.put = async (req, res) => {
  const userId = req.params.userId
  if (!(typeof userId === 'string' && userId.length > 0)) {
    res
      .status(400)
      .json({ message: 'Invalid value for "userId" URL parameter.' })
    return
  }

  try {
    const promoterUserId = util.getCognitoUserId(req)
    await customersController.addAccountToAdminsGroup({
      targetUserId: userId,
      promoterUserSub: util.getCognitoIdentitySub(req),
      promoterUserId
    })
    res.status(200).json({})
  } catch (error) {
    console.log('Error:', error)
    res.status(500).json(util.makeErrorResponse(error))
  }
}
