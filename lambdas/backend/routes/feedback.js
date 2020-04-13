'use strict'

const feedbackController = require('dev-portal-common/feedback-controller')
const util = require('../util')

const feedbackEnabled = !!process.env.FeedbackSnsTopicArn

exports.get = async (req, res) => {
  console.log(`GET /feedback for Cognito ID: ${util.getCognitoIdentityId(req)}`)

  if (!feedbackEnabled) {
    res.status(401).json('Customer feedback not enabled')
  } else {
    const feedback = await feedbackController.fetchFeedback()
    res.status(200).json(feedback)
  }
}

exports.post = async (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`POST /feedback for Cognito ID: ${cognitoIdentityId}`)

  if (!feedbackEnabled) {
    res.status(401).json('Customer feedback not enabled')
  } else {
    await feedbackController.submitFeedback(cognitoIdentityId, req.body.message)
    res.status(200).json('success')
  }
}
