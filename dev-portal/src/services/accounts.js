import _ from 'lodash'

import { resolveAfter } from 'utils/test-utils'

const NUM_MOCK_ACCOUNTS = 157 // should be prime
const mockData = (() => {
  const now = Date.now()
  const adminStep = 10
  return Array.from({ length: NUM_MOCK_ACCOUNTS }).map((_value, index) => {
    let inviter = 1
    let promoter = null
    if (_.inRange(index, 20, 90)) {
      promoter = 10
      inviter = 10
    } else if (_.inRange(index, 90, 120)) {
      promoter = 20
      inviter = 20
    } else if (_.inRange(index, 120, NUM_MOCK_ACCOUNTS)) {
      promoter = 100
      inviter = 100
    }

    return {
      identityPoolId: `identityPoolId${index}`,
      userPoolId: `userPoolId${index}`,
      emailAddress: `${index}@example.com`,
      datePromoted:
        promoter &&
        new Date(now + ((index * 3) % NUM_MOCK_ACCOUNTS) * 1000).toJSON(),
      promoterEmailAddress: promoter && `${promoter}@example.com`,
      promoterIdentityPoolId: promoter && `identityPoolId${promoter}`,
      inviterEmailAddress: inviter && `${inviter}@example.com`,
      inviterIdentityPoolId: inviter && `identityPoolId${inviter}`,
      dateRegistered: new Date(
        now + ((index * 3) % NUM_MOCK_ACCOUNTS) * 1000,
      ).toJSON(),
      apiKeyId: `apiKeyId${index}`,
      registrationMethod: _.sample(['open', 'invite', 'request']),
      isAdmin: index % adminStep === 0,
    }
  })
})()

const mockPendingRequestAccounts = _.cloneDeep(mockData).map(
  ({ dateRegistered, ...rest }) => ({ ...rest, dateRequested: dateRegistered }),
)

const mockPendingInviteAccounts = _.cloneDeep(mockData).map(
  ({ dateRegistered, ...rest }) => ({
    ...rest,
    dateInvited: dateRegistered,
  }),
)

export const fetchRegisteredAccounts = () => {
  return resolveAfter(1500, mockData.slice())
}

export const fetchAdminAccounts = () => {
  return resolveAfter(1500, mockData.filter(account => account.isAdmin))
}

export const fetchPendingRequestAccounts = () => {
  return resolveAfter(1500, mockPendingRequestAccounts.slice())
}

export const fetchPendingInviteAccounts = () => {
  return resolveAfter(1500, mockPendingInviteAccounts.slice())
}

export const deleteAccountByIdentityPoolId = async identityPoolId => {
  await resolveAfter(1500)

  const accountIndex = mockData.findIndex(
    account => account.identityPoolId === identityPoolId,
  )
  if (accountIndex === -1) {
    throw new Error('Account not found!')
  }
  if (identityPoolId.endsWith('10')) {
    throw new Error('Something weird happened!')
  }
  mockData.splice(accountIndex, 1)
}

export const deleteInviteByIdentityPoolId = async identityPoolId => {
  await resolveAfter(1500)

  const accountIndex = mockPendingInviteAccounts.findIndex(
    account => account.identityPoolId === identityPoolId,
  )
  if (accountIndex === -1) {
    throw new Error('Account not found!')
  }
  if (identityPoolId.endsWith('10')) {
    throw new Error('Something weird happened!')
  }
  mockPendingInviteAccounts.splice(accountIndex, 1)
}

export const createInviteByEmail = async emailAddress => {
  await resolveAfter(1500)

  const account = {
      identityPoolId: `temp`,
      userPoolId: `temp`,
      emailAddress,
      dateInvited: new Date(Date.now()).toJSON(),
      inviterEmailAddress: `you@localhost`,
      inviterIdentityPoolId: `yourIdentityId`,
      apiKeyId: `temp`,
      registrationMethod: `invite`,
  }

  mockPendingInviteAccounts.push(account)
}

export const promoteAccountByIdentityPoolId = async identityPoolId => {
  await resolveAfter(1500)

  const account = mockData.find(
    account => account.identityPoolId === identityPoolId,
  )
  if (account === undefined) {
    throw new Error('Account not found!')
  }
  if (account.isAdmin) {
    throw new Error('Account is already an Admin!')
  }
  account.isAdmin = true
}

export const approveAccountRequestByIdentityPoolId = async identityPoolId => {
  await resolveAfter(1500)

  if (!mockPendingRequestAccounts.some(matchingIdentityId(identityPoolId))) {
    throw new Error('Account not found!')
  }
  if (identityPoolId.endsWith('10')) {
    throw new Error('Something weird happened!')
  }

  _.remove(mockPendingRequestAccounts, matchingIdentityId(identityPoolId))
}

export const denyAccountRequestByIdentityPoolId = async identityPoolId => {
  await resolveAfter(1500)

  if (!mockPendingRequestAccounts.some(matchingIdentityId(identityPoolId))) {
    throw new Error('Account not found!')
  }
  if (identityPoolId.endsWith('10')) {
    throw new Error('Something weird happened!')
  }

  _.remove(mockPendingRequestAccounts, matchingIdentityId(identityPoolId))
}

const matchingIdentityId = targetId => account =>
  account.identityPoolId === targetId
