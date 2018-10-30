// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This lambda function is attached to the "pre-sign-up" cognito hook
// It determines if a user should be added to the user pool
// Right now, it always returns true.

exports.handler = (event, context, callback) => {
    event.response = { autoConfirmUser: true }; callback(null, event);
}
