// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This lambda function is attached to the Cognito User Pool's "Post
// Authentication" Lambda Trigger.

const customersController = require('dev-portal-common/customers-controller')
const { getEnv } = require('dev-portal-common/get-env')

exports.handler = async event => {
  const userId = event.request.userAttributes.sub
  const userPoolId = event.userPoolId

  console.log(`In Post Authentication trigger for userId=[${userId}]`)

  try {
    const { account, source } = await customersController.findAccountByUserId(
      userId
    )
    if (account === null) {
      console.error('No matching account found!')
      throw new Error('No matching account found!')
    }

    if (account.RegistrationStatus === 'pendingInvite') {
      console.log('Found pendingInvite account')
      const updateStatusPromise = customersController.updateAccountFromSource({
        account: {
          ...account,
          RegistrationStatus: 'registered',
          DateRegistered: new Date().toISOString()
        },
        source
      })
      const addToRegisteredGroupPromise = customersController.addAccountToRegisteredGroup(
        {
          username: userId,
          userPoolId,
          registeredGroupName: getEnv('RegisteredGroupName')
        }
      )
      await Promise.all([updateStatusPromise, addToRegisteredGroupPromise])
    }
  } catch (error) {
    console.error(error)
    throw error
  }

  return event
}
