import _ from 'lodash'

import { resolveAfter } from '__tests__/utils'

const now = Date.now()
const numMockAccounts = 157 // should be prime
const mockData = Array.from({ length: numMockAccounts }).map(
  (_value, index) => ({
    identityPoolId: `identityPoolId${index}`,
    userPoolId: `userPoolId${index}`,
    emailAddress: `${index}@example.com`,
    dateRegistered: new Date(
      now + ((index * 3) % numMockAccounts) * 1000,
    ).toJSON(),
    apiKeyId: `apiKeyId${index}`,
    registrationMethod: _.sample(['open', 'invite', 'request']),
    isAdmin: index % 20 === 0,
  }),
)

export const fetchRegisteredAccounts = () => {
  return resolveAfter(1500, mockData.slice())
}

export const deleteAccountByIdentityPoolId = async identityPoolId => {
  await resolveAfter(1500)

  const accountIndex = mockData.findIndex(account => account.identityPoolId === identityPoolId)
  if (accountIndex === -1) {
    throw new Error('Account not found!')
  }
  if (identityPoolId.endsWith('10')) {
    throw new Error('Something weird happened!')
  }
  mockData.splice(accountIndex, 1)
}

export const promoteAccountByIdentityPoolId = async identityPoolId => {
  await resolveAfter(1500)

  const account = mockData.find(account => account.identityPoolId === identityPoolId)
  if (account === undefined) {
    throw new Error('Account not found!')
  }
  if (account.isAdmin) {
    throw new Error('Account is already an Admin!')
  }
  account.isAdmin = true
}
