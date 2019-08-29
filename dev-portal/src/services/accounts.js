import _ from 'lodash'

import { resolveAfter } from 'utils/test-utils'

const NUM_MOCK_ACCOUNTS = 157 // should be prime
const mockData = (() => {
  const now = Date.now()
  const adminStep = 10
  return _.range(NUM_MOCK_ACCOUNTS).map(index => {
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
      IdentityId: `identityId${index}`,
      UserId: `userId${index}`,
      EmailAddress: `${index}@example.com`,
      DatePromoted:
        promoter &&
        new Date(now + ((index * 3) % NUM_MOCK_ACCOUNTS) * 1000).toJSON(),
      PromoterEmailAddress: promoter && `${promoter}@example.com`,
      PromoterIdentityId: promoter && `identityId${promoter}`,
      InviterEmailAddress: inviter && `${inviter}@example.com`,
      InviterIdentityId: inviter && `identityId${inviter}`,
      DateRegistered: new Date(
        now + ((index * 3) % NUM_MOCK_ACCOUNTS) * 1000,
      ).toJSON(),
      ApiKeyId: `apiKeyId${index}`,
      RegistrationMethod: _.sample(['open', 'invite', 'request']),
      isAdmin: index % adminStep === 0,
    }
  })
})()

const mockPendingRequestAccounts = _.cloneDeep(mockData).map(
  ({ DateRegistered, ...rest }) => ({ ...rest, DateRequested: DateRegistered }),
)

const mockPendingInviteAccounts = _.cloneDeep(mockData).map(
  ({ DateRegistered, ...rest }) => ({
    ...rest,
    DateInvited: DateRegistered,
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

export const deleteAccountByIdentityId = async identityId => {
  await resolveAfter(1500)

  const accountIndex = mockData.findIndex(
    account => account.IdentityId === identityId,
  )
  if (accountIndex === -1) {
    throw new Error('Account not found!')
  }
  if (identityId.endsWith('10')) {
    throw new Error('Something weird happened!')
  }
  mockData.splice(accountIndex, 1)
}

export const deleteInviteByIdentityId = async identityId => {
  await resolveAfter(1500)

  const accountIndex = mockPendingInviteAccounts.findIndex(
    account => account.IdentityId === identityId,
  )
  if (accountIndex === -1) {
    throw new Error('Account not found!')
  }
  if (identityId.endsWith('10')) {
    throw new Error('Something weird happened!')
  }
  mockPendingInviteAccounts.splice(accountIndex, 1)
}

export const createInviteByEmail = async emailAddress => {
  await resolveAfter(1500)

  const account = {
    IdentityId: `temp`,
    UserId: `temp`,
    EmailAddress: emailAddress,
    DateInvited: new Date(Date.now()).toJSON(),
    InviterEmailAddress: `you@localhost`,
    InviterIdentityId: `yourIdentityId`,
    ApiKeyId: `temp`,
    RegistrationMethod: `invite`,
  }

  mockPendingInviteAccounts.push(account)
}

export const promoteAccountByIdentityId = async identityId => {
  await resolveAfter(1500)

  const account = mockData.find(account => account.IdentityId === identityId)
  if (account === undefined) {
    throw new Error('Account not found!')
  }
  if (account.isAdmin) {
    throw new Error('Account is already an Admin!')
  }
  account.isAdmin = true
}

export const approveAccountRequestByIdentityId = async identityId => {
  await resolveAfter(1500)

  if (!mockPendingRequestAccounts.some(matchingIdentityId(identityId))) {
    throw new Error('Account not found!')
  }
  if (identityId.endsWith('10')) {
    throw new Error('Something weird happened!')
  }

  _.remove(mockPendingRequestAccounts, matchingIdentityId(identityId))
}

export const denyAccountRequestByIdentityId = async identityId => {
  await resolveAfter(1500)

  if (!mockPendingRequestAccounts.some(matchingIdentityId(identityId))) {
    throw new Error('Account not found!')
  }
  if (identityId.endsWith('10')) {
    throw new Error('Something weird happened!')
  }

  _.remove(mockPendingRequestAccounts, matchingIdentityId(identityId))
}

const matchingIdentityId = targetId => account =>
  account.IdentityId === targetId
