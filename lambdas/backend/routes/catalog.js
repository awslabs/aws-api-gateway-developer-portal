'use strict'

const util = require('../util')

exports.get = async (event) => {
  console.log(`GET /catalog for Cognito ID: ${util.getCognitoIdentityId(event)}`)
  return util.catalog()
}
