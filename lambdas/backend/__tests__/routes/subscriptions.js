const util = require('../../util')
const customersController = require('dev-portal-common/customers-controller')
const { makeCatalog, bindEnv, promiser, generateRequestContext, generateResponseContext } = require('../../../setup-jest')

const subscriptions = require('../../routes/subscriptions')

describe('GET /subscriptions', () => {
  const originalGetUsagePlansForCustomer = customersController.getUsagePlansForCustomer

  afterEach(() => {
    customersController.getUsagePlansForCustomer = originalGetUsagePlansForCustomer
  })

  test('it returns the list of items on success', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()

    customersController.getUsagePlansForCustomer = jest.fn((id, error, success) => {
      process.nextTick(success, { items: 'result' })
    })

    await subscriptions.get(req, res)

    expect(customersController.getUsagePlansForCustomer).toHaveBeenCalledTimes(1)
    expect(customersController.getUsagePlansForCustomer).toHaveBeenCalledWith(
      util.getCognitoIdentityId(req),
      expect.any(Function),
      expect.any(Function)
    )

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith('result')
  })

  test('it propagates errors', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()

    customersController.getUsagePlansForCustomer = jest.fn((id, error, success) => {
      process.nextTick(error, 'error')
    })

    await expect(subscriptions.get(req, res)).rejects.toBe('error')

    expect(customersController.getUsagePlansForCustomer).toHaveBeenCalledTimes(1)
    expect(customersController.getUsagePlansForCustomer).toHaveBeenCalledWith(
      util.getCognitoIdentityId(req),
      expect.any(Function),
      expect.any(Function)
    )

    expect(res.status).not.toHaveBeenCalled()
  })
})

describe('PUT /subscriptions/:usagePlanId', () => {
  const originalGetObject = util.s3.getObject
  const originalConsoleError = console.error
  const originalSubscribe = customersController.subscribe
  const setEnv = bindEnv()

  afterEach(() => {
    customersController.subscribe = originalSubscribe
    util.s3.getObject = originalGetObject
    console.error = originalConsoleError
  })

  test('it subscribes to an existing usage plan', async () => {
    const catalog = makeCatalog()
    const req = generateRequestContext()
    const res = generateResponseContext()
    const response = {
      Body: JSON.stringify(catalog)
    }
    req.params = { usagePlanId: 'plan2' }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    customersController.subscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    await subscriptions.put(req, res)

    expect(customersController.subscribe).toHaveBeenCalledTimes(1)
    expect(customersController.subscribe).toHaveBeenCalledWith(
      util.getCognitoIdentityId(req),
      'plan2',
      expect.any(Function),
      expect.any(Function)
    )

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith('result')
  })

  test('it fails on empty usage plan', async () => {
    const catalog = makeCatalog()
    catalog.apiGateway[1].apis.length = 0
    const req = generateRequestContext()
    const res = generateResponseContext()
    const response = {
      Body: JSON.stringify(catalog)
    }
    req.params = { usagePlanId: 'plan2' }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.subscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    await subscriptions.put(req, res)

    expect(customersController.subscribe).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid Usage Plan ID' })
    )
  })

  test('it fails on missing usage plan', async () => {
    const catalog = makeCatalog()
    const req = generateRequestContext()
    const res = generateResponseContext()
    const response = {
      Body: JSON.stringify(catalog)
    }
    req.params = { usagePlanId: 'plan15' }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.subscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    await subscriptions.put(req, res)

    expect(customersController.subscribe).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid Usage Plan ID' })
    )
  })

  test('it propagates subscription error', async () => {
    const catalog = makeCatalog()
    const req = generateRequestContext()
    const res = generateResponseContext()
    const response = {
      Body: JSON.stringify(catalog)
    }
    req.params = { usagePlanId: 'plan2' }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.subscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(error, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    await expect(subscriptions.put(req, res)).rejects.toBe('result')

    expect(customersController.subscribe).toHaveBeenCalledTimes(1)
    expect(customersController.subscribe).toHaveBeenCalledWith(
      util.getCognitoIdentityId(req),
      'plan2',
      expect.any(Function),
      expect.any(Function)
    )

    expect(res.status).not.toHaveBeenCalled()
  })
})

describe('DELETE /subscriptions/:usagePlanId', () => {
  const originalGetObject = util.s3.getObject
  const originalConsoleError = console.error
  const originalUnsubscribe = customersController.unsubscribe
  const setEnv = bindEnv()

  afterEach(() => {
    customersController.unsubscribe = originalUnsubscribe
    util.s3.getObject = originalGetObject
    console.error = originalConsoleError
  })

  test('it unsubscribes from an existing usage plan', async () => {
    const catalog = makeCatalog()
    const req = generateRequestContext()
    const res = generateResponseContext()
    const response = {
      Body: JSON.stringify(catalog)
    }
    req.params = { usagePlanId: 'plan2' }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    customersController.unsubscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    await subscriptions.delete(req, res)

    expect(customersController.unsubscribe).toHaveBeenCalledTimes(1)
    expect(customersController.unsubscribe).toHaveBeenCalledWith(
      util.getCognitoIdentityId(req),
      'plan2',
      expect.any(Function),
      expect.any(Function)
    )

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith('result')
  })

  test('it fails on empty usage plan', async () => {
    const catalog = makeCatalog()
    catalog.apiGateway[1].apis.length = 0
    const req = generateRequestContext()
    const res = generateResponseContext()
    const response = {
      Body: JSON.stringify(catalog)
    }
    req.params = { usagePlanId: 'plan2' }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.unsubscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    await subscriptions.delete(req, res)

    expect(customersController.unsubscribe).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid Usage Plan ID' })
    )
  })

  test('it fails on missing usage plan', async () => {
    const catalog = makeCatalog()
    const req = generateRequestContext()
    const res = generateResponseContext()
    const response = {
      Body: JSON.stringify(catalog)
    }
    req.params = { usagePlanId: 'plan15' }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.unsubscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    await subscriptions.delete(req, res)

    expect(customersController.unsubscribe).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledTimes(1)
    expect(res.status.mock.results[0].value.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid Usage Plan ID' })
    )
  })

  test('it propagates subscription error', async () => {
    const catalog = makeCatalog()
    const req = generateRequestContext()
    const res = generateResponseContext()
    const response = {
      Body: JSON.stringify(catalog)
    }
    req.params = { usagePlanId: 'plan2' }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.unsubscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(error, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    await expect(subscriptions.delete(req, res)).rejects.toBe('result')

    expect(customersController.unsubscribe).toHaveBeenCalledTimes(1)
    expect(customersController.unsubscribe).toHaveBeenCalledWith(
      util.getCognitoIdentityId(req),
      'plan2',
      expect.any(Function),
      expect.any(Function)
    )

    expect(res.status).not.toHaveBeenCalled()
  })
})
