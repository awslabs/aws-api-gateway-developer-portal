import { apiGatewayClientWithCredentials as getApiGatewayClient } from 'services/api'

const getAccountsWithFilter = async filter => {
  const apiGatewayClient = await getApiGatewayClient()
  const response = await apiGatewayClient.get(
    '/accounts',
    undefined,
    undefined,
    { queryParams: { filter } },
  )
  return response.data.accounts
}

export const fetchRegisteredAccounts = () => getAccountsWithFilter('registered')

export const fetchAdminAccounts = () => getAccountsWithFilter('admin')

export const fetchPendingRequestAccounts = () =>
  getAccountsWithFilter('pendingRequest')

export const fetchPendingInviteAccounts = () =>
  getAccountsWithFilter('pendingInvite')

export const deleteAccountByUserId = async userId => {
  const apiGatewayClient = await getApiGatewayClient()
  userId = encodeURIComponent(userId)
  const response = await apiGatewayClient.delete(`/accounts/${userId}`)
  return response.data
}

export const deleteInviteByUserId = async userId => {
  const apiGatewayClient = await getApiGatewayClient()
  userId = encodeURIComponent(userId)
  const response = await apiGatewayClient.delete(`/accounts/${userId}`)
  return response.data
}

export const createInviteByEmail = async emailAddress => {
  const apiGatewayClient = await getApiGatewayClient()
  const response = await apiGatewayClient.post(
    '/accounts',
    {},
    { targetEmailAddress: emailAddress },
    {},
  )
  return response.data
}

export const resendInviteByEmail = async emailAddress => {
  const apiGatewayClient = await getApiGatewayClient()
  const response = await apiGatewayClient.put(
    `/accounts/resendInvite`,
    {},
    { targetEmailAddress: emailAddress },
    {},
  )
  return response.data
}

export const promoteAccountByUserId = async userId => {
  const apiGatewayClient = await getApiGatewayClient()
  userId = encodeURIComponent(userId)
  const response = await apiGatewayClient.put(
    `/accounts/${userId}/promoteToAdmin`,
    {},
    {},
    {},
  )
  return response.data
}

export const approveAccountRequestByUserId = async userId => {
  const apiGatewayClient = await getApiGatewayClient()
  userId = encodeURIComponent(userId)
  const response = await apiGatewayClient.put(
    `/accounts/${userId}/approveRequest`,
    {},
    {},
    {},
  )
  return response.data
}

export const denyAccountRequestByUserId = async userId => {
  const apiGatewayClient = await getApiGatewayClient()
  userId = encodeURIComponent(userId)
  const response = await apiGatewayClient.put(
    `/accounts/${userId}/denyRequest`,
    {},
    {},
    {},
  )
  return response.data
}
