const util = require('../../../util')
const customersController = require('dev-portal-common/customers-controller')
const { invoke, response, generateEvent } = require('../../../../setup-jest')

const accounts = require('../../../routes/admin/accounts')

describe('GET /admin/accounts', () => {
  const originalListPendingRequestAccounts = customersController.listPendingRequestAccounts
  const originalListPendingInviteAccounts = customersController.listPendingInviteAccounts
  const originalListAdminAccounts = customersController.listAdminAccounts
  const originalListRegisteredAccounts = customersController.listRegisteredAccounts

  afterEach(() => {
    customersController.listPendingRequestAccounts = originalListPendingRequestAccounts
    customersController.listPendingInviteAccounts = originalListPendingInviteAccounts
    customersController.listAdminAccounts = originalListAdminAccounts
    customersController.listRegisteredAccounts = originalListRegisteredAccounts
  })

  // test('?filter=pendingRequest success', async () => {
  //   customersController.listPendingRequestAccounts = jest.fn(async () => 'result')

  //   const result = await invoke(accounts.get, generateEvent({ query: { filter: 'pendingRequest' } }))

  //   expect(customersController.listPendingRequestAccounts).toBeCalledTimes(1)
  //   expect(customersController.listPendingRequestAccounts).toBeCalledWith()

  //   expect(result).toEqual(response(200, { accounts: 'result' }))
  // })

  // test('?filter=pendingRequest fail', async () => {
  //   // eslint-disable-next-line prefer-promise-reject-errors
  //   customersController.listPendingRequestAccounts = jest.fn(() => Promise.reject('result'))

  //   await expect(invoke(accounts, generateEvent({ query: { filter: 'pendingRequest' } }))).rejects.toBe('result')

  //   expect(customersController.listPendingRequestAccounts).toBeCalledTimes(1)
  //   expect(customersController.listPendingRequestAccounts).toBeCalledWith()
  // })

  // test('?filter=pendingInvite success', async () => {
  //   customersController.listPendingInviteAccounts = jest.fn(async () => 'result')

  //   const result = await invoke(accounts.get, generateEvent({ query: { filter: 'pendingInvite' } }))

  //   expect(customersController.listPendingInviteAccounts).toBeCalledTimes(1)
  //   expect(customersController.listPendingInviteAccounts).toBeCalledWith()

  //   expect(result).toEqual(response(200, { accounts: 'result' }))
  // })

  // test('?filter=pendingInvite fail', async () => {
  //   // eslint-disable-next-line prefer-promise-reject-errors
  //   customersController.listPendingInviteAccounts = jest.fn(() => Promise.reject('result'))

  //   await expect(invoke(accounts.get, generateEvent({ query: { filter: 'pendingInvite' } }))).rejects.toBe('result')

  //   expect(customersController.listPendingInviteAccounts).toBeCalledTimes(1)
  //   expect(customersController.listPendingInviteAccounts).toBeCalledWith()
  // })

  test('?filter=admin success', async () => {
    customersController.listAdminAccounts = jest.fn(async () => 'result')

    const result = await invoke(accounts, generateEvent({ query: { filter: 'admin' } }))

    expect(customersController.listAdminAccounts).toBeCalledTimes(1)
    expect(customersController.listAdminAccounts).toBeCalledWith()

    expect(result).toEqual(response(200, { accounts: 'result' }))
  })

  test('?filter=admin fail', async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.listAdminAccounts = jest.fn(() => Promise.reject('result'))

    await expect(invoke(accounts, generateEvent({ query: { filter: 'admin' } }))).rejects.toBe('result')

    expect(customersController.listAdminAccounts).toBeCalledTimes(1)
    expect(customersController.listAdminAccounts).toBeCalledWith()
  })

  test('?filter=registered success', async () => {
    customersController.listRegisteredAccounts = jest.fn(async () => 'result')

    const result = await invoke(accounts, generateEvent({ query: { filter: 'registered' } }))

    expect(customersController.listRegisteredAccounts).toBeCalledTimes(1)
    expect(customersController.listRegisteredAccounts).toBeCalledWith()

    expect(result).toEqual(response(200, { accounts: 'result' }))
  })

  test('?filter=registered fail', async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.listRegisteredAccounts = jest.fn(() => Promise.reject('result'))

    await expect(invoke(accounts, generateEvent({ query: { filter: 'registered' } }))).rejects.toBe('result')

    expect(customersController.listRegisteredAccounts).toBeCalledTimes(1)
    expect(customersController.listRegisteredAccounts).toBeCalledWith()
  })
})

describe('POST /admin/accounts', () => {
  const originalCreateAccountInvite = customersController.createAccountInvite

  afterEach(() => {
    customersController.createAccountInvite = originalCreateAccountInvite
  })

  test('works with normal inputs', async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.createAccountInvite = jest.fn(async () => 'result')

    const event = generateEvent({ body: '{"targetEmailAddress":"test"}' })
    const result = await invoke(accounts.post, event)

    expect(customersController.createAccountInvite).toBeCalledTimes(1)
    expect(customersController.createAccountInvite).toBeCalledWith(
      expect.objectContaining({
        targetEmailAddress: 'test',
        inviterUserId: util.getCognitoIdentityId(event)
      })
    )

    expect(result).toEqual(response(200, 'result'))
  })

  test('fails with empty email address string', async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.createAccountInvite = jest.fn(async () => 'result')

    const result = await invoke(accounts.post, generateEvent({ body: '{"targetEmailAddress":""}' }))

    expect(customersController.createAccountInvite).not.toHaveBeenCalled()

    expect(result).toEqual(response(400, { message: 'Invalid value for "targetEmailAddress" parameter.' }))
  })

  test('fails with no email address', async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.createAccountInvite = jest.fn(async () => 'result')

    const result = await invoke(accounts.post, generateEvent({ body: '{"targetEmailAddress":null}' }))

    expect(customersController.createAccountInvite).not.toHaveBeenCalled()
    expect(result).toEqual(response(400, { message: 'Invalid value for "targetEmailAddress" parameter.' }))
  })
})

describe('DELETE /admin/accounts/:userId', () => {
  const originalDeleteAccountByUserId = customersController.deleteAccountByUserId

  afterEach(() => {
    customersController.deleteAccountByUserId = originalDeleteAccountByUserId
  })

  test('works with normal inputs', async () => {
    customersController.deleteAccountByUserId = jest.fn(async () => {})

    const result = await invoke(e => accounts.delete(e, 'invitee@example.com'))

    expect(customersController.deleteAccountByUserId).toBeCalledTimes(1)
    expect(customersController.deleteAccountByUserId).toBeCalledWith('invitee@example.com')

    expect(result).toEqual(response(200, {}))
  })
})
