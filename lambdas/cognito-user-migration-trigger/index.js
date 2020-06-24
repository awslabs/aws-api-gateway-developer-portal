'use strict'

const AWS = require('aws-sdk')
const { CognitoIdentityServiceProvider } = require('aws-sdk')

const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
  apiVersion: '2016-04-18'
})

exports.cognitoIdentityServiceProvider = CognitoIdentityServiceProvider

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
      UserPoolId: process.env.OldUserPool
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
    throw new Error(`Bad trigger source: ${event.triggerSource}`)
  }

  try {
    const [userAttributes] = await Promise.all([
      (async () => {
        const options = {
          UserPoolId: process.env.OldUserPool,
          AttributesToGet: ['email', 'username'],
          Filter: `email = "${event.userName.replace(/"/, '\\"')}"`,
          Limit: 1
        }

        do {
          const resp = await cognitoIdentityServiceProvider.listUsers(options).promise()

          if (resp.Users.length) {
            const user = resp.Users[0]
            const groups = []

            const options = {
              UserPoolId: process.env.OldUserPool,
              Username: user.Username
            }

            do {
              const resp = await cognitoIdentityServiceProvider.adminListGroupsForUser(options).promise()

              for (const group of resp.Groups) {
                if (group.GroupName === process.env.OldAdminsGroup) groups.push('admin')
                else if (group.GroupName === process.env.OldRegisteredGroup) groups.push('registered')
              }

              options.NextToken = resp.NextToken
            } while (options.NextToken)

            return {
              email: user.Attributes.find(e => e.Name === 'email').Value,
              username: user.Username,
              email_verified: 'true',
              'custom:groups': groups.join(',')
            }
          }

          options.PaginationToken = resp.PaginationToken
        } while (options.PaginationToken)

        throw new Error('Bad username or password')
      })(),
      authReq
    ])

    event.response.userAttributes = userAttributes
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
