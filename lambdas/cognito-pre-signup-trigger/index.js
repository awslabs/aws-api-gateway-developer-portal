'use strict'
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

// Pulled from https://html.spec.whatwg.org/multipage/input.html#e-mail-state-(type%3Demail) and
// optimized in a few ways for size:
// - Classes of `[A-Za-z0-9]` were shortened to the equivalent `[^_\W]`.
// - Other instances of `0-9` in classes were converted to the shorthand `\d`.
// - The whole regexp was made case-insensitive to avoid the need for `A-Za-z` in classes.
// - As we're only testing, I replaced all the non-capturing groups with capturing ones.
//
// This is the same regexp as is used in dev-portal/src/pages/Admin/Accounts/PendingInvites.jsx.
const validEmailRegex =
  /^[\w.!#$%&'*+/=?^`{|}~-]+@[^_\W]([a-z\d-]{0,61}[^_\W])?(\.[^_\W]([a-z\d-]{0,61}[^_\W])?)*$/i

exports.handler = async event => {
  const email = event.request.userAttributes.email
  if (email == null) throw new Error('Email is required.')
  if (!validEmailRegex.test(email)) throw new Error('Email is invalid.')

  // To block the sign-up from occurring, throw an error. The message will be
  // displayed to the user when they attempt to sign up, before Cognito asks
  // for confirmation.

  console.info(`In Pre Signup Trigger for username=[${event.userName}] and email=[${email}]`)

  return event
}
