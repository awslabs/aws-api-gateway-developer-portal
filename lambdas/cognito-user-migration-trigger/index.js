'use strict'

const AWS = require('aws-sdk')
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
  apiVersion: '2016-04-18'
})

exports.handler = async (event) => {
  let authReq
  if (event.triggerSource === 'UserMigration_Authentication') {
    authReq = cognitoIdentityServiceProvider.adminInitiateAuth({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: event.userName,
        PASSWORD: event.request.password
      },
      ClientId: event.callerContext.clientId,
      UserPoolId: event.userPoolId
    }).promise().then(resp => {
      if (resp.code && resp.message) throw new Error('Bad password')
      event.response.finalUserStatus = 'CONFIRMED'
    })
  } else if (event.triggerSource === 'UserMigration_ForgotPassword') {
    // Non-error response required to enable password-reset code to be sent to user
    // `event.response.finalUserStatus` is left alone to trigger reset
  } else {
    throw new Error('Bad triggerSource ' + event.triggerSource)
  }

  const [userInfoRequest] = await Promise.all([
    cognitoIdentityServiceProvider.adminGetUser({
      UserPoolId: event.userPoolId,
      Username: event.userName
    }).promise().then(resp => {
      if (resp.code && resp.message) throw new Error('Bad password')
    }),
    authReq
  ])

  const email = userInfoRequest.UserAttributes.find(e => e.Name === 'email').Value

  event.response.userAttributes = { email, email_verified: 'true' }
  event.response.messageAction = 'SUPPRESS'
  return event
}
