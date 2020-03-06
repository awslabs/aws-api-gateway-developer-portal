// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Dumps account data (as defined in v3) from Cognito and DynamoDB, to be used
// for migration to v4. Outputs tsv as a JSON string.

'use strict'

const AWS = require('aws-sdk')
const pager = require('dev-portal-common/pager')
const { getCognitoUserSub } = require('dev-portal-common/get-cognito-user-sub')

const handler = async (_event, _context) => {
  const {
    CustomersTableName: customersTableName,
    UserPoolId: userPoolId,
    AdminsGroupName: adminsGroupName
  } = process.env

  console.log('Got params:')
  console.log(`customersTableName: ${customersTableName}`)
  console.log(`userPoolId: ${userPoolId}`)
  console.log(`adminsGroupName: ${adminsGroupName}`)

  return fetchAccountData({ customersTableName, userPoolId, adminsGroupName })
}

/**
 * Account fields, as they should be written to the exported TSV.
 */
const ACCOUNT_DATA_FIELDS = [
  'emailAddress',
  'username',
  'isAdmin',
  'identityPoolId',
  'userPoolId',
  'apiKeyId'
]

/**
 * TSV header for account account fields.
 */
const ACCOUNT_DATA_TSV_HEADER = ACCOUNT_DATA_FIELDS.join('\t')

const fetchAccountData = async ({ customersTableName, userPoolId, adminsGroupName }) => {
  const [adminUserIds, accountsFromTable, usernamesByUserId] =
    await Promise.all([
      fetchAdminUserIds({ userPoolId, adminsGroupName }),
      fetchCustomersTableItems({ tableName: customersTableName }),
      fetchUsernamesByUserId({ userPoolId })
    ])

  let accounts = accountsFromTable
  accounts = insertIsAdmin({ accounts, adminUserIds })
  accounts = insertUsernames({ accounts, usernamesByUserId })

  const accountsAsTsv = accounts
    .map(account => accountDataAsTsv(account))
    .join('\n')
  return `${ACCOUNT_DATA_TSV_HEADER}\n${accountsAsTsv}\n`
}

/**
 * Fetches the UserPoolIds of all users in the AdminsGroup.
 */
const fetchAdminUserIds = async ({ userPoolId, adminsGroupName }) => {
  const admins = await pager.fetchUsersInCognitoUserPoolGroup({
    userPoolId,
    groupName: adminsGroupName,
    cognitoClient: exports.cognitoClient
  })
  return new Set(admins.map(admin => getCognitoUserSub(admin)))
}

/**
 * Fetches all users in the given user pool, and returns a map of UserPoolId
 * (`cognito:sub`) to Username.
 */
const fetchUsernamesByUserId = async ({ userPoolId }) => {
  const users = await pager.fetchUsersInCognitoUserPool({
    userPoolId,
    cognitoClient: exports.cognitoClient
  })
  return new Map(users.map(user => [getCognitoUserSub(user), user.Username]))
}

/**
 * Fetches all items from the CustomersTable, unwrapping DDB's datatype marker.
 */
const fetchCustomersTableItems = async ({ tableName }) => {
  const rawItems = await pager.fetchItemsInDynamoDbTable({
    dynamoDbClient: exports.dynamoDbClient,
    tableName,
    extraParams: {
      Limit: 2,
      ProjectionExpression: 'Id, UserPoolId, ApiKeyId'
    }
  })
  return rawItems.map(item => ({
    identityPoolId: item.Id.S,
    userPoolId: item.UserPoolId.S,
    apiKeyId: item.ApiKeyId.S
  }))
}

/**
 * Returns a copy of the `accounts` Array, except each element has `isAdmin`
 * set to `true` iff its UserPoolId is in the `adminUserIds` set.
 */
const insertIsAdmin = ({ adminUserIds, accounts }) =>
  accounts.map(account => ({
    ...account,
    isAdmin: adminUserIds.has(account.userPoolId)
  }))

/**
 * Returns a copy of the `accounts` array, except each element has `username`
 * set to the username as specified in the `usernamesByUserId` Map.
 */
const insertUsernames = ({ accounts, usernamesByUserId }) =>
  accounts.map(account => ({
    ...account,
    username: usernamesByUserId.get(account.userPoolId)
  }))

/**
 * Formats an account object as a string of tab-separated values.
 *
 * Note that no escaping is required, since all fields consist of
 * non-whitespace characters in the printable subset of Unicode. See [1] for
 * username constraints.
 *
 * [1]: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UserType.html
 */
const accountDataAsTsv = account =>
  ACCOUNT_DATA_FIELDS.map(key =>
    key === 'emailAddress' ? '' : account[key].toString()
  ).join('\t')

exports = module.exports = {
  cognitoClient: new AWS.CognitoIdentityServiceProvider(),
  dynamoDbClient: new AWS.DynamoDB(),
  handler
}
