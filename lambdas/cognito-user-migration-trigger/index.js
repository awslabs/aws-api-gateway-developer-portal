'use strict'

const AWS = require('aws-sdk')

exports.cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
  apiVersion: '2016-04-18'
})

exports.handler = async (event) => {
  let authReq

  if (event.triggerSource === 'UserMigration_Authentication') {
    authReq = exports.cognitoIdentityServiceProvider.adminInitiateAuth({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: event.userName,
        PASSWORD: event.request.password
      },
      ClientId: event.callerContext.clientId,
      UserPoolId: event.userPoolId
    }).promise().then(resp => {
      if (resp.AuthenticationResult == null) {
        // Username exists, but for whatever reason, the password wasn't sufficient.
        // Let's simplify and just force a password reset here.
        event.response.finalUserStatus = 'RESET_REQUIRED'
      } else {
        event.response.finalUserStatus = 'CONFIRMED'
      }
    }, e => {
      // Let's go through the standard "forgot password" flow for these errors.
      if (e.code !== 'PasswordResetRequiredException') throw e
      event.response.finalUserStatus = 'RESET_REQUIRED'
    })
  } else if (event.triggerSource === 'UserMigration_ForgotPassword') {
    // Non-error response required to enable password-reset code to be sent to user
    event.response.finalUserStatus = 'RESET_REQUIRED'
  } else {
    throw new Error('Bad triggerSource ' + event.triggerSource)
  }

  try {
    const [getUserResp] = await Promise.all([
      exports.cognitoIdentityServiceProvider.adminGetUser({
        UserPoolId: event.userPoolId,
        Username: event.userName
      }).promise(),
      authReq
    ])

    const email = getUserResp.UserAttributes.find(e => e.Name === 'email').Value

    event.response.userAttributes = { email, email_verified: 'true' }
    event.response.messageAction = 'SUPPRESS'
    event.response.desiredDeliveryMediums = 'email'
    event.response.forceAliasCreation = true
    return event
  } catch (e) {
    // Mask the obvious errors.
    if (
      e.code === 'NotAuthorizedException' ||
      e.code === 'UserLambdaValidationException' ||
      e.code === 'UserNotConfirmedException' ||
      e.code === 'UserNotFoundException' ||
      e.code === 'MFAMethodNotFoundException'
    ) {
      throw new Error('Bad username or password')
    }

    if (e.code === 'InvalidParameterException') throw new Error('Invalid parameter')
    if (e.code === 'TooManyRequestsException') throw new Error('Too many requests')
    console.error(e)
    throw new Error('Internal error occurred')
  }
}
