'use strict'

const feedbackController = require('dev-portal-common/feedback-controller')
const util = require('../util')

const feedbackEnabled = !!process.env.FeedbackSnsTopicArn

exports.get = async (event) => {
  console.log(`GET /feedback for Cognito ID: ${util.getCognitoIdentityId(event)}`)

  if (!feedbackEnabled) return util.abort(event, 401, 'Customer feedback not enabled')
  return feedbackController.fetchFeedback()
}

exports.post = async (event) => {
  const cognitoIdentityId = util.getCognitoIdentityId(event)
  console.log(`POST /feedback for Cognito ID: ${cognitoIdentityId}`)

  if (!feedbackEnabled) return util.abort(event, 401, 'Customer feedback not enabled')
  await feedbackController.submitFeedback(cognitoIdentityId, util.getBody(event).message)
  return { message: 'success' }
}
