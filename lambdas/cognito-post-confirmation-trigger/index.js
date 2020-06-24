// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This lambda function is attached to the Cognito User Pool's "Post
// Confirmation" Lambda Trigger.

const customersController = require('dev-portal-common/customers-controller')
const { getEnv } = require('dev-portal-common/get-env')
const { performMigration } = require('dev-portal-common/migrate-group-membership')

exports.handler = async event => {
  const accountRegistrationMode = getEnv('AccountRegistrationMode')
  const userId = event.request.userAttributes.sub
  const emailAddress = event.request.userAttributes.email
  const groupsToEnsure = event.request.userAttributes.groups

  console.log(
    `In Post Confirmation trigger for userId=[${userId}]` +
      `, in accountRegistrationMode=[${accountRegistrationMode}]`
  )

  if (groupsToEnsure) await performMigration(userId, groupsToEnsure)

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
    await customersController.saveRequestPreLoginAccount({
      userId,
      emailAddress
    })
  } else {
    // Note: Post Confirmation trigger *does not* run for accounts created via
    // AdminCreateUser (e.g. in Invite mode).
    console.warn(
      `Unexpected accountRegistrationMode [${accountRegistrationMode}]`
    )
  }

  return event
}
