// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This lambda function is attached to the Cognito User Pool's "Post
// Confirmation" Lambda Trigger.

const customersController = require('dev-portal-common/customers-controller')
const { getEnv } = require('dev-portal-common/get-env')

exports.handler = async event => {
  const accountRegistrationMode = getEnv('AccountRegistrationMode')
  const userId = event.request.userAttributes.sub
  const emailAddress = event.request.userAttributes.email

  console.log(
    `In Post Confirmation trigger for userId=[${userId}]` +
      `, in accountRegistrationMode=[${accountRegistrationMode}]`
  )

  // We only care about sign-up confirmation, not forgot-password confirmation.
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    console.info(
      'Exiting Post Confirmation trigger early because' +
        ` triggerSource=[${event.triggerSource}]` +
        ' != "PostConfirmation_ConfirmSignUp"'
    )
    return event
  }

  if (accountRegistrationMode === 'open') {
    const registeredGroupName = getEnv('RegisteredGroupName')
    const username = event.userName
    const userPoolId = event.userPoolId

    await Promise.all([
      customersController.saveOpenPreLoginAccount({ userId, emailAddress }),
      customersController.addAccountToRegisteredGroup({
        username,
        userPoolId,
        registeredGroupName
      })
    ])
  } else if (accountRegistrationMode === 'request') {
    try {
      await customersController.saveRequestPreLoginAccount({
        userId,
        emailAddress
      })
    } catch (error) {
      console.error(error)
    }
  } else {
    // Note: Post Confirmation trigger *does not* run for accounts created via
    // AdminCreateUser (e.g. in Invite mode).
    console.warn(
      `Unexpected accountRegistrationMode [${accountRegistrationMode}]`
    )
  }

  return event
}
