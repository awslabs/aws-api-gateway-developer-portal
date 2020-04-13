'use strict'

const util = require('../util')

exports.get = async (req, res) => {
  console.log(`GET /catalog for Cognito ID: ${util.getCognitoIdentityId(req)}`)
  const catalog = await util.catalog()
  res.status(200).json(catalog)
}
