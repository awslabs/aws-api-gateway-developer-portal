// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This lambda function is attached to the Cognito User Pool's "Pre Sign-up"
// Lambda Trigger, which determines whether a user should be allowed to sign
// up.
//
// Note that, in Invite mode, the `AllowAdminCreateUserOnly` option is
// configured on the user pool's `AllowAdminCreateUserOnly` property. So the
// hosted UI will block the user from signing up, and this lambda will never
// run.

exports.handler = async event => {
  // To block the sign-up from occurring, throw an error. The message will be
  // displayed to the user when they attempt to sign up, before Cognito asks
  // for confirmation.

  console.info(
    `In Pre Signup Trigger for username=[${event.userName}]` +
      ` and email=[${event.request.userAttributes.email}]`,
  )

  return event
}
