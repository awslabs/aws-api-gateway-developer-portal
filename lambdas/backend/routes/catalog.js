'use strict'

const util = require('../util')

exports.get = (req, res) => {
  console.log(`GET /catalog for Cognito ID: ${util.getCognitoIdentityId(req)}`)
  util.catalog()
    .then(catalog => res.status(200).json(catalog))
    .catch(error => res.status(error.statusCode).json(error))
}
