'use strict'

const index = require('../index')
const { promiser, bindMock } = require('../../setup-jest')

describe('cognito-user-migration-trigger', () => {
  // Note: many of these are byzantine tests that might seem useless, but they exist purely for completeness.

  const setMock = bindMock()

  const TEST_CLIENT_ID = `Client-${Math.random()}`
  const TEST_POOL_ID = `Pool-${Math.random()}`
  const TEST_USER_EMAIL = `user-${Math.random()}@example.com`
  const TEST_PASS = `password-${Math.random()}`

  function makeEvent (type) {
    return {
      triggerSource: type,
      userName: TEST_USER_EMAIL,
      request: {
        password: TEST_PASS
      },
      callerContext: {
        clientId: TEST_CLIENT_ID
      },
      userPoolId: TEST_POOL_ID,
      response: {
        finalUserStatus: null,
        userAttributes: null,
        messageAction: null,
        desiredDeliveryMediums: null,
        forceAliasCreation: null
      }
    }
  }

  function fail (code) {
    const error = new Error(`Request error (${code})`)
    error.code = code
    return promiser(null, error)
  }
  function passUser () {
    return promiser({
      UserAttributes: [{ Name: 'email', Value: TEST_USER_EMAIL }]
    })
  }

  describe('UserMigration_Authentication', () => {
    function passAuth () {
      return promiser({ AuthenticationResult: {} })
    }

    function passNoAuth () {
      return promiser({ AuthenticationResult: null })
    }

    function passDelayedAuth () {
      return promiser(new Promise(resolve => setTimeout(() => resolve({ AuthenticationResult: {} }), 0)))
    }

    function passDelayedNoAuth () {
      return promiser(new Promise(resolve => setTimeout(() => resolve({ AuthenticationResult: null }), 0)))
    }

    function failDelayed (code) {
      const error = new Error(`Request error (${code})`)
      error.code = code
      return promiser(new Promise((resolve, reject) => setTimeout(() => reject(error), 0)))
    }

    function passDelayedUser () {
      return promiser(new Promise(resolve => setTimeout(() => resolve({
        UserAttributes: [{ Name: 'email', Value: TEST_USER_EMAIL }]
      }), 0)))
    }

    async function checkFail ({ adminInitiateAuth, adminGetUser, message }) {
      const oldConsoleError = console.error
      // Ignore logged errors in the tests
      if (message === 'Internal error occurred') console.error = () => { }

      try {
        setMock(index.cognitoIdentityServiceProvider, 'adminInitiateAuth').mockReturnValue(adminInitiateAuth)
        setMock(index.cognitoIdentityServiceProvider, 'adminGetUser').mockReturnValue(adminGetUser)

        const event = makeEvent('UserMigration_Authentication')
        await expect(index.handler(event)).rejects.toThrow(message)

        expect(index.cognitoIdentityServiceProvider.adminInitiateAuth).toBeCalledWith(
          expect.objectContaining({
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
            AuthParameters: {
              USERNAME: event.userName,
              PASSWORD: event.request.password
            },
            ClientId: event.callerContext.clientId,
            UserPoolId: event.userPoolId
          })
        )

        expect(index.cognitoIdentityServiceProvider.adminGetUser).toBeCalledWith(
          expect.objectContaining({
            UserPoolId: event.userPoolId,
            Username: event.userName
          })
        )
      } finally {
        console.error = oldConsoleError
      }
    }

    async function checkPass ({ adminInitiateAuth, adminGetUser, status }) {
      setMock(index.cognitoIdentityServiceProvider, 'adminInitiateAuth').mockReturnValue(adminInitiateAuth)
      setMock(index.cognitoIdentityServiceProvider, 'adminGetUser').mockReturnValue(adminGetUser)

      const event = makeEvent('UserMigration_Authentication')
      const result = await index.handler(event)

      expect(result).toBe(event)

      expect(event.response.finalUserStatus).toBe(status)
      expect(event.response.userAttributes.email).toBe(TEST_USER_EMAIL)
      expect(event.response.userAttributes.email_verified).toBe('true')
      expect(event.response.messageAction).toBe('SUPPRESS')
      expect(event.response.forceAliasCreation).toBe(true)

      expect(index.cognitoIdentityServiceProvider.adminInitiateAuth).toBeCalledWith(
        expect.objectContaining({
          AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: event.userName,
            PASSWORD: event.request.password
          },
          ClientId: event.callerContext.clientId,
          UserPoolId: event.userPoolId
        })
      )

      expect(index.cognitoIdentityServiceProvider.adminGetUser).toBeCalledWith(
        expect.objectContaining({
          UserPoolId: event.userPoolId,
          Username: event.userName
        })
      )
    }

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed NotAuthorizedException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('NotAuthorizedException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed UserLambdaValidationException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserLambdaValidationException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed UserNotConfirmedException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotConfirmedException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed UserNotFoundException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotFoundException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed MFAMethodNotFoundException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('MFAMethodNotFoundException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed InvalidParameterException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InvalidParameterException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed TooManyRequestsException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('TooManyRequestsException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed InternalErrorException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InternalErrorException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed SomeOtherException, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('SomeOtherException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth returns delayed auth result, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: passDelayedAuth(),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth returns delayed no auth result, adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: passDelayedNoAuth(),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed NotAuthorizedException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('NotAuthorizedException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed UserLambdaValidationException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserLambdaValidationException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed UserNotConfirmedException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotConfirmedException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed UserNotFoundException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotFoundException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed MFAMethodNotFoundException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('MFAMethodNotFoundException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed InvalidParameterException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InvalidParameterException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed TooManyRequestsException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('TooManyRequestsException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed InternalErrorException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InternalErrorException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed SomeOtherException, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('SomeOtherException'),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth returns delayed auth result, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: passDelayedAuth(),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth returns delayed no auth result, adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: passDelayedNoAuth(),
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws delayed NotAuthorizedException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('NotAuthorizedException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws delayed UserLambdaValidationException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserLambdaValidationException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws delayed UserNotConfirmedException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotConfirmedException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws delayed UserNotFoundException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotFoundException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws delayed MFAMethodNotFoundException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('MFAMethodNotFoundException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws delayed InvalidParameterException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InvalidParameterException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws delayed TooManyRequestsException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('TooManyRequestsException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws delayed InternalErrorException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InternalErrorException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws delayed SomeOtherException, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('SomeOtherException'),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth returns delayed auth result, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: passDelayedAuth(),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth returns delayed no auth result, adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: passDelayedNoAuth(),
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws delayed NotAuthorizedException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('NotAuthorizedException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws delayed UserLambdaValidationException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserLambdaValidationException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws delayed UserNotConfirmedException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotConfirmedException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws delayed UserNotFoundException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotFoundException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws delayed MFAMethodNotFoundException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('MFAMethodNotFoundException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws delayed InvalidParameterException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InvalidParameterException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws delayed TooManyRequestsException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('TooManyRequestsException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws delayed InternalErrorException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InternalErrorException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws delayed SomeOtherException, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('SomeOtherException'),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth returns delayed auth result, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: passDelayedAuth(),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth returns delayed no auth result, adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: passDelayedNoAuth(),
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws delayed NotAuthorizedException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('NotAuthorizedException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed UserLambdaValidationException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserLambdaValidationException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed UserNotConfirmedException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotConfirmedException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed UserNotFoundException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotFoundException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed MFAMethodNotFoundException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('MFAMethodNotFoundException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed InvalidParameterException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InvalidParameterException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed TooManyRequestsException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('TooManyRequestsException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed InternalErrorException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InternalErrorException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed SomeOtherException, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('SomeOtherException'),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns delayed auth result, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: passDelayedAuth(),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns delayed no auth result, adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: passDelayedNoAuth(),
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed NotAuthorizedException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('NotAuthorizedException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed UserLambdaValidationException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserLambdaValidationException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed UserNotConfirmedException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotConfirmedException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed UserNotFoundException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('UserNotFoundException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed MFAMethodNotFoundException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('MFAMethodNotFoundException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed InvalidParameterException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InvalidParameterException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed TooManyRequestsException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('TooManyRequestsException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed InternalErrorException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('InternalErrorException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws delayed SomeOtherException, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: failDelayed('SomeOtherException'),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns delayed auth result, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: passDelayedAuth(),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns delayed no auth result, adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: passDelayedNoAuth(),
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws delayed NotAuthorizedException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws delayed UserNotFoundException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: failDelayed('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws delayed InvalidParameterException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: failDelayed('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws delayed TooManyRequestsException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: failDelayed('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws delayed InternalErrorException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: failDelayed('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: passAuth(),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser throws delayed SomeOtherException', () =>
      checkFail({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: failDelayed('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser returns user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: passUser(),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser returns user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: passUser(),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser returns user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: passUser(),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser returns user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: passUser(),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser returns user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: passUser(),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser returns user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: passUser(),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser returns user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: passUser(),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser returns user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: passUser(),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser returns user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: passUser(),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser returns user attributes', () =>
      checkPass({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: passUser(),
        status: 'RESET_REQUIRED'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser returns user attributes', () =>
      checkPass({
        adminInitiateAuth: passAuth(),
        adminGetUser: passUser(),
        status: 'CONFIRMED'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser returns user attributes', () =>
      checkPass({
        adminInitiateAuth: passNoAuth(),
        adminGetUser: passUser(),
        status: 'RESET_REQUIRED'
      })
    )

    test('adminInitiateAuth throws NotAuthorizedException, adminGetUser returns delayed user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('NotAuthorizedException'),
        adminGetUser: passDelayedUser(),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserLambdaValidationException, adminGetUser returns delayed user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('UserLambdaValidationException'),
        adminGetUser: passDelayedUser(),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotConfirmedException, adminGetUser returns delayed user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotConfirmedException'),
        adminGetUser: passDelayedUser(),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws UserNotFoundException, adminGetUser returns delayed user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('UserNotFoundException'),
        adminGetUser: passDelayedUser(),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws MFAMethodNotFoundException, adminGetUser returns delayed user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('MFAMethodNotFoundException'),
        adminGetUser: passDelayedUser(),
        message: 'Bad username or password'
      })
    )

    test('adminInitiateAuth throws InvalidParameterException, adminGetUser returns delayed user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('InvalidParameterException'),
        adminGetUser: passDelayedUser(),
        message: 'Invalid parameter'
      })
    )

    test('adminInitiateAuth throws TooManyRequestsException, adminGetUser returns delayed user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('TooManyRequestsException'),
        adminGetUser: passDelayedUser(),
        message: 'Too many requests'
      })
    )

    test('adminInitiateAuth throws InternalErrorException, adminGetUser returns delayed user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('InternalErrorException'),
        adminGetUser: passDelayedUser(),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws SomeOtherException, adminGetUser returns delayed user attributes', () =>
      checkFail({
        adminInitiateAuth: fail('SomeOtherException'),
        adminGetUser: passDelayedUser(),
        message: 'Internal error occurred'
      })
    )

    test('adminInitiateAuth throws PasswordResetRequiredException, adminGetUser returns delayed user attributes', () =>
      checkPass({
        adminInitiateAuth: fail('PasswordResetRequiredException'),
        adminGetUser: passDelayedUser(),
        status: 'RESET_REQUIRED'
      })
    )

    test('adminInitiateAuth returns auth result, adminGetUser returns delayed user attributes', () =>
      checkPass({
        adminInitiateAuth: passAuth(),
        adminGetUser: passDelayedUser(),
        status: 'CONFIRMED'
      })
    )

    test('adminInitiateAuth returns no auth result, adminGetUser returns delayed user attributes', () =>
      checkPass({
        adminInitiateAuth: passNoAuth(),
        adminGetUser: passDelayedUser(),
        status: 'RESET_REQUIRED'
      })
    )
  })

  describe('UserMigration_ForgotPassword', () => {
    async function checkFail ({ adminGetUser, message }) {
      const oldConsoleError = console.error
      // Ignore logged errors in the tests
      if (message === 'Internal error occurred') console.error = () => { }

      try {
        setMock(index.cognitoIdentityServiceProvider, 'adminInitiateAuth').mockReturnValue(promiser({ AuthenticationResult: 'dummy' }))
        setMock(index.cognitoIdentityServiceProvider, 'adminGetUser').mockReturnValue(adminGetUser)

        const event = makeEvent('UserMigration_ForgotPassword')
        await expect(index.handler(event)).rejects.toThrow(message)

        expect(index.cognitoIdentityServiceProvider.adminInitiateAuth).not.toHaveBeenCalled()

        expect(index.cognitoIdentityServiceProvider.adminGetUser).toBeCalledWith(
          expect.objectContaining({
            UserPoolId: event.userPoolId,
            Username: event.userName
          })
        )
      } finally {
        console.error = oldConsoleError
      }
    }

    async function checkPass ({ adminGetUser, status }) {
      setMock(index.cognitoIdentityServiceProvider, 'adminInitiateAuth').mockReturnValue(promiser({ AuthenticationResult: 'dummy' }))
      setMock(index.cognitoIdentityServiceProvider, 'adminGetUser').mockReturnValue(adminGetUser)

      const event = makeEvent('UserMigration_ForgotPassword')
      const result = await index.handler(event)

      expect(result).toBe(event)

      expect(event.response.finalUserStatus).toBe(status)
      expect(event.response.userAttributes.email).toBe(TEST_USER_EMAIL)
      expect(event.response.userAttributes.email_verified).toBe('true')
      expect(event.response.messageAction).toBe('SUPPRESS')
      expect(event.response.forceAliasCreation).toBe(true)

      expect(index.cognitoIdentityServiceProvider.adminInitiateAuth).not.toHaveBeenCalled()

      expect(index.cognitoIdentityServiceProvider.adminGetUser).toBeCalledWith(
        expect.objectContaining({
          UserPoolId: event.userPoolId,
          Username: event.userName
        })
      )
    }

    test('adminGetUser throws NotAuthorizedException', () =>
      checkFail({
        adminGetUser: fail('NotAuthorizedException'),
        message: 'Bad username or password'
      })
    )

    test('adminGetUser throws UserNotFoundException', () =>
      checkFail({
        adminGetUser: fail('UserNotFoundException'),
        message: 'Bad username or password'
      })
    )

    test('adminGetUser throws InvalidParameterException', () =>
      checkFail({
        adminGetUser: fail('InvalidParameterException'),
        message: 'Invalid parameter'
      })
    )

    test('adminGetUser throws TooManyRequestsException', () =>
      checkFail({
        adminGetUser: fail('TooManyRequestsException'),
        message: 'Too many requests'
      })
    )

    test('adminGetUser throws InternalErrorException', () =>
      checkFail({
        adminGetUser: fail('InternalErrorException'),
        message: 'Internal error occurred'
      })
    )

    test('adminGetUser throws SomeOtherException', () =>
      checkFail({
        adminGetUser: fail('SomeOtherException'),
        message: 'Internal error occurred'
      })
    )

    test('adminGetUser returns user attributes', () =>
      checkPass({
        adminGetUser: passUser(),
        status: 'RESET_REQUIRED'
      })
    )
  })

  describe('Ohter trigger sources', () => {
    test('throws exception based on source', async () => {
      const oldConsoleError = console.error
      // Ignore logged errors in the tests
      console.error = () => { }

      try {
        setMock(index.cognitoIdentityServiceProvider, 'adminInitiateAuth').mockReturnValue(promiser({ AuthenticationResult: 'dummy' }))
        setMock(index.cognitoIdentityServiceProvider, 'adminGetUser').mockReturnValue(promiser({ UserAttributes: 'dummy' }))

        const event = makeEvent('Invalid_Trigger_Source')
        await expect(index.handler(event)).rejects.toThrow('Bad trigger source: Invalid_Trigger_Source')

        expect(index.cognitoIdentityServiceProvider.adminInitiateAuth).not.toHaveBeenCalled()
        expect(index.cognitoIdentityServiceProvider.adminGetUser).not.toHaveBeenCalled()
      } finally {
        console.error = oldConsoleError
      }
    })
  })
})
