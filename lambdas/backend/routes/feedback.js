'use strict'

const feedbackController = require('dev-portal-common/feedback-controller')
const util = require('../util')

const feedbackEnabled = !!process.env.FeedbackSnsTopicArn

exports.get = (req, res) => {
  console.log(`GET /feedback for Cognito ID: ${util.getCognitoIdentityId(req)}`)

  if (!feedbackEnabled) {
    res.status(401).json('Customer feedback not enabled')
  } else {
    feedbackController.fetchFeedback()
      .then(feedback => {
        res.status(200).json(feedback)
      })
      .catch(err => {
        console.log(`error: ${err}`)
        res.status(500).json(err)
      })
  }
}

exports.post = (req, res) => {
  const cognitoIdentityId = util.getCognitoIdentityId(req)
  console.log(`POST /feedback for Cognito ID: ${cognitoIdentityId}`)

  if (!feedbackEnabled) {
    res.status(401).json('Customer feedback not enabled')
  } else {
    feedbackController.submitFeedback(cognitoIdentityId, req.body.message)
      .then(() => res.status(200).json('success'))
      .catch((err) => res.status(500).json(err))
  }
}
