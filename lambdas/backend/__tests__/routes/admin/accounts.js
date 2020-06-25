const util = require('../../../util')
const customersController = require('dev-portal-common/customers-controller')
const { generateRequestContext, generateResponseContext } = require('../../../../setup-jest')

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
  //   const req = generateRequestContext()
  //   const res = generateResponseContext()
  //   req.query = { filter: 'pendingRequest' }

  //   customersController.listPendingRequestAccounts = jest.fn(async () => 'result')

  //   await accounts.get(req, res)

  //   expect(customersController.listPendingRequestAccounts).toBeCalledTimes(1)
  //   expect(customersController.listPendingRequestAccounts).toBeCalledWith()

  //   expect(res.status).toHaveBeenCalledTimes(1)
  //   expect(res.status).toHaveBeenCalledWith(200)
  //   expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
  //   expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
  //     expect.objectContaining({ accounts: 'result' })
  //   )
  // })

  // test('?filter=pendingRequest fail', async () => {
  //   const req = generateRequestContext()
  //   const res = generateResponseContext()
  //   req.query = { filter: 'pendingRequest' }

  //   // eslint-disable-next-line prefer-promise-reject-errors
  //   customersController.listPendingRequestAccounts = jest.fn(() => Promise.reject('result'))

  //   await expect(accounts.get(req, res)).rejects.toBe('result')

  //   expect(customersController.listPendingRequestAccounts).toBeCalledTimes(1)
  //   expect(customersController.listPendingRequestAccounts).toBeCalledWith()

  //   expect(res.status).not.toHaveBeenCalled()
  // })

  test('?filter=pendingInvite success', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()
    req.query = { filter: 'pendingInvite' }

    customersController.listPendingInviteAccounts = jest.fn(async () => 'result')

    await accounts.get(req, res)

    expect(customersController.listPendingInviteAccounts).toBeCalledTimes(1)
    expect(customersController.listPendingInviteAccounts).toBeCalledWith()

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
      expect.objectContaining({ accounts: 'result' })
    )
  })

  test('?filter=pendingInvite fail', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()
    req.query = { filter: 'pendingInvite' }

    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.listPendingInviteAccounts = jest.fn(() => Promise.reject('result'))

    await expect(accounts.get(req, res)).rejects.toBe('result')

    expect(customersController.listPendingInviteAccounts).toBeCalledTimes(1)
    expect(customersController.listPendingInviteAccounts).toBeCalledWith()

    expect(res.status).not.toHaveBeenCalled()
  })

  test('?filter=admin success', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()
    req.query = { filter: 'admin' }

    customersController.listAdminAccounts = jest.fn(async () => 'result')

    await accounts.get(req, res)

    expect(customersController.listAdminAccounts).toBeCalledTimes(1)
    expect(customersController.listAdminAccounts).toBeCalledWith()

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
      expect.objectContaining({ accounts: 'result' })
    )
  })

  test('?filter=admin fail', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()
    req.query = { filter: 'admin' }

    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.listAdminAccounts = jest.fn(() => Promise.reject('result'))

    await expect(accounts.get(req, res)).rejects.toBe('result')

    expect(customersController.listAdminAccounts).toBeCalledTimes(1)
    expect(customersController.listAdminAccounts).toBeCalledWith()

    expect(res.status).not.toHaveBeenCalled()
  })

  test('?filter=registered success', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()
    req.query = { filter: 'registered' }

    customersController.listRegisteredAccounts = jest.fn(async () => 'result')

    await accounts.get(req, res)

    expect(customersController.listRegisteredAccounts).toBeCalledTimes(1)
    expect(customersController.listRegisteredAccounts).toBeCalledWith()

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
      expect.objectContaining({ accounts: 'result' })
    )
  })

  test('?filter=registered fail', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()
    req.query = { filter: 'registered' }

    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.listRegisteredAccounts = jest.fn(() => Promise.reject('result'))

    await expect(accounts.get(req, res)).rejects.toBe('result')

    expect(customersController.listRegisteredAccounts).toBeCalledTimes(1)
    expect(customersController.listRegisteredAccounts).toBeCalledWith()

    expect(res.status).not.toHaveBeenCalled()
  })
})

describe('POST /admin/accounts', () => {
  const originalCreateAccountInvite = customersController.createAccountInvite

  afterEach(() => {
    customersController.createAccountInvite = originalCreateAccountInvite
  })

  test('works with normal inputs', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()
    req.body = { targetEmailAddress: 'test' }

    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.createAccountInvite = jest.fn(async () => 'result')

    await accounts.post(req, res)

    expect(customersController.createAccountInvite).toBeCalledTimes(1)
    expect(customersController.createAccountInvite).toBeCalledWith(
      expect.objectContaining({
        targetEmailAddress: 'test',
        inviterUserId: util.getCognitoIdentityId(req)
      })
    )

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith('result')
  })

  test('fails with empty email address string', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()
    req.body = { targetEmailAddress: '' }

    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.createAccountInvite = jest.fn(async () => 'result')

    await accounts.post(req, res)

    expect(customersController.createAccountInvite).not.toHaveBeenCalled()

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid value for "targetEmailAddress" parameter.' })
    )
  })

  test('fails with no email address', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()
    req.body = { targetEmailAddress: null }

    // eslint-disable-next-line prefer-promise-reject-errors
    customersController.createAccountInvite = jest.fn(async () => 'result')

    await accounts.post(req, res)

    expect(customersController.createAccountInvite).not.toHaveBeenCalled()

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid value for "targetEmailAddress" parameter.' })
    )
  })
})

describe('DELETE /admin/accounts/:userId', () => {
  const originalDeleteAccountByUserId = customersController.deleteAccountByUserId

  afterEach(() => {
    customersController.deleteAccountByUserId = originalDeleteAccountByUserId
  })

  test('works with normal inputs', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()
    req.params = { userId: 'invitee@example.com' }

    customersController.deleteAccountByUserId = jest.fn(async () => {})

    await accounts.delete(req, res)

    expect(customersController.deleteAccountByUserId).toBeCalledTimes(1)
    expect(customersController.deleteAccountByUserId).toBeCalledWith('invitee@example.com')

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
      expect.objectContaining({})
    )
  })
})
