'use strict'

const util = require('../../../../util')
const catalogUtil = require('../../../../catalog-util')

exports.delete = async (event, genericId) => {
  console.log(`DELETE /admin/catalog/visibility for Cognito ID: ${util.getCognitoIdentityId(event)}`)

  // for apigateway managed APIs, provide "apiId_stageName"
  // in the apiKey field
  console.log('delete request params:', { genericId })
  console.log('generic api')
  await catalogUtil.deleteFile(`catalog/${genericId}.json`)
  return { message: 'Success' }
}
