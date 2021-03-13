const util = require('../../util')
const customersController = require('dev-portal-common/customers-controller')
const { makeCatalog, bindEnv, promiser, invoke, response, generateEvent } = require('../../../setup-jest')

const subscriptions = require('../../routes/subscriptions')

describe('GET /subscriptions', () => {
  const originalGetUsagePlansForCustomer = customersController.getUsagePlansForCustomer

  afterEach(() => {
    customersController.getUsagePlansForCustomer = originalGetUsagePlansForCustomer
  })

  test('it returns the list of items on success', async () => {
    customersController.getUsagePlansForCustomer = jest.fn((id, error, success) => {
      process.nextTick(success, { items: 'result' })
    })

    const result = await invoke(subscriptions.get)

    expect(customersController.getUsagePlansForCustomer).toHaveBeenCalledTimes(1)
    expect(customersController.getUsagePlansForCustomer).toHaveBeenCalledWith(
      util.getCognitoIdentityId(generateEvent()),
      expect.any(Function),
      expect.any(Function)
    )

    expect(result).toEqual(response(201, 'result'))
  })

  test('it propagates errors', async () => {
    customersController.getUsagePlansForCustomer = jest.fn((id, error, success) => {
      process.nextTick(error, 'error')
    })

    await expect(invoke(subscriptions.get)).rejects.toBe('error')

    expect(customersController.getUsagePlansForCustomer).toHaveBeenCalledTimes(1)
    expect(customersController.getUsagePlansForCustomer).toHaveBeenCalledWith(
      util.getCognitoIdentityId(generateEvent()),
      expect.any(Function),
      expect.any(Function)
    )
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
    const response = {
      Body: JSON.stringify(catalog)
    }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    customersController.subscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    const result = await invoke(e => subscriptions.put(e, 'plan2'))

    expect(customersController.subscribe).toHaveBeenCalledTimes(1)
    expect(customersController.subscribe).toHaveBeenCalledWith(
      util.getCognitoIdentityId(generateEvent()),
      'plan2',
      expect.any(Function),
      expect.any(Function)
    )

    expect(result).toEqual(response(201, 'result'))
  })

  test('it fails on empty usage plan', async () => {
    const catalog = makeCatalog()
    catalog.apiGateway[1].apis.length = 0
    const response = {
      Body: JSON.stringify(catalog)
    }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.subscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    const result = await invoke(e => subscriptions.put(e, 'plan2'))

    expect(customersController.subscribe).not.toHaveBeenCalled()
    expect(result).toHaveBeenCalledWith(response(404, { message: 'Invalid Usage Plan ID' }))
  })

  test('it fails on missing usage plan', async () => {
    const catalog = makeCatalog()
    const response = {
      Body: JSON.stringify(catalog)
    }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.subscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    const result = await invoke(e => subscriptions.put(e, 'plan15'))

    expect(customersController.subscribe).not.toHaveBeenCalled()
    expect(result).toHaveBeenCalledWith(response(404, { message: 'Invalid Usage Plan ID' }))
  })

  test('it propagates subscription error', async () => {
    const catalog = makeCatalog()
    const response = {
      Body: JSON.stringify(catalog)
    }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.subscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(error, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    await expect(invoke(e => subscriptions.put(e, 'plan2'))).rejects.toBe('result')

    expect(customersController.subscribe).toHaveBeenCalledTimes(1)
    expect(customersController.subscribe).toHaveBeenCalledWith(
      util.getCognitoIdentityId(generateEvent()),
      'plan2',
      expect.any(Function),
      expect.any(Function)
    )
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
    const response = {
      Body: JSON.stringify(catalog)
    }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    customersController.unsubscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    const result = await invoke(e => subscriptions.delete(e, 'plan2'))

    expect(customersController.unsubscribe).toHaveBeenCalledTimes(1)
    expect(customersController.unsubscribe).toHaveBeenCalledWith(
      util.getCognitoIdentityId(generateEvent()),
      'plan2',
      expect.any(Function),
      expect.any(Function)
    )

    expect(result).toEqual(response(200, 'result'))
  })

  test('it fails on empty usage plan', async () => {
    const catalog = makeCatalog()
    catalog.apiGateway[1].apis.length = 0
    const response = {
      Body: JSON.stringify(catalog)
    }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.unsubscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    const result = await invoke(e => subscriptions.delete(e, 'plan2'))

    expect(customersController.unsubscribe).not.toHaveBeenCalled()
    expect(result).toEqual(response(404, { message: 'Invalid Usage Plan ID' }))
  })

  test('it fails on missing usage plan', async () => {
    const catalog = makeCatalog()
    const response = {
      Body: JSON.stringify(catalog)
    }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.unsubscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(success, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    const result = await invoke(e => subscriptions.delete(e, 'plan15'))

    expect(customersController.unsubscribe).not.toHaveBeenCalled()
    expect(result).toEqual(response(404, { message: 'Invalid Usage Plan ID' }))
  })

  test('it propagates subscription error', async () => {
    const catalog = makeCatalog()
    const response = {
      Body: JSON.stringify(catalog)
    }

    util.s3.getObject = jest.fn().mockReturnValue(promiser(response))
    // In case it fails, I still want it to resolve.
    customersController.unsubscribe = jest.fn((id, usagePlanId, error, success) => {
      process.nextTick(error, 'result')
    })

    setEnv('StaticBucketName', 'test-bucket')

    await expect(invoke(e => subscriptions.delete(e, 'plan2'))).rejects.toBe('result')

    expect(customersController.unsubscribe).toHaveBeenCalledTimes(1)
    expect(customersController.unsubscribe).toHaveBeenCalledWith(
      util.getCognitoIdentityId(generateEvent()),
      'plan2',
      expect.any(Function),
      expect.any(Function)
    )
  })
})
