'use strict'

const util = require('../util')
const { makeCatalog, bindEnv, promiser } = require('../../setup-jest')

describe('backend/util', () => {
  describe('makeErrorResponse()', () => {
    const setEnv = bindEnv()

    test('makes an error response from an error using its own message with dev mode enabled', () => {
      setEnv('DevelopmentMode', 'true')
      const error = new Error('message')
      const response = util.makeErrorResponse(error)

      expect(response).toMatchObject({ message: 'message', stack: error.stack })
    })

    test('makes an error response from an error using a custom message with dev mode enabled', () => {
      setEnv('DevelopmentMode', 'true')
      const error = new Error('message')
      const response = util.makeErrorResponse(error, 'custom')

      expect(response).toMatchObject({ message: 'custom', stack: error.stack })
    })

    test('makes an error response from an error without a stack with dev mode enabled', () => {
      setEnv('DevelopmentMode', 'true')
      const error = new Error('message')
      error.stack = null
      const response = util.makeErrorResponse(error, 'custom')

      expect(response).toMatchObject({ message: 'custom', stack: error.stack })
    })

    test('makes an error response from an error using its own message with local dev mode enabled', () => {
      setEnv('LocalDevelopmentMode', 'true')
      const error = new Error('message')
      const response = util.makeErrorResponse(error)

      expect(response).toMatchObject({ message: 'message', stack: error.stack })
    })

    test('makes an error response from an error using a custom message with local dev mode enabled', () => {
      setEnv('LocalDevelopmentMode', 'true')
      const error = new Error('message')
      const response = util.makeErrorResponse(error, 'custom')

      expect(response).toMatchObject({ message: 'custom', stack: error.stack })
    })

    test('makes an error response from an error without a stack with local dev mode enabled', () => {
      setEnv('LocalDevelopmentMode', 'true')
      const error = new Error('message')
      error.stack = null
      const response = util.makeErrorResponse(error, 'custom')

      expect(response).toMatchObject({ message: 'custom', stack: error.stack })
    })

    test('makes an error response from an error using its own message with dev mode disabled', () => {
      setEnv('LocalDevelopmentMode', 'false')
      const error = new Error('message')
      const response = util.makeErrorResponse(error)

      expect(response).toMatchObject({ message: 'message' })
    })

    test('makes an error response from an error using a custom message with dev mode disabled', () => {
      setEnv('LocalDevelopmentMode', 'false')
      const error = new Error('message')
      const response = util.makeErrorResponse(error, 'custom')

      expect(response).toMatchObject({ message: 'custom' })
    })

    test('makes an error response from an error without a stack with dev mode disabled', () => {
      setEnv('LocalDevelopmentMode', 'false')
      const error = new Error('message')
      error.stack = null
      const response = util.makeErrorResponse(error, 'custom')

      expect(response).toMatchObject({ message: 'custom' })
    })
  })

  describe('getUsagePlanFromCatalog()', () => {
    test('finds an existing member', () => {
      const catalog = makeCatalog()

      const expected = catalog.apiGateway[1]
      const actual = util.getUsagePlanFromCatalog('plan2', catalog)

      expect(actual).toBe(expected)
    })

    test('fails when no such ID exists', () => {
      const catalog = makeCatalog()

      const expected = null
      const actual = util.getUsagePlanFromCatalog('plan15', catalog)

      expect(actual).toBe(expected)
    })
  })

  describe('findApiInCatalog()', () => {
    test('finds an existing API Gateway member', () => {
      const catalog = makeCatalog()

      const expected = catalog.apiGateway[1].apis[4]
      const actual = util.findApiInCatalog('plan2_api2', 'plan2_stage1', catalog)

      expect(actual).toBe(expected)
    })

    test('finds an existing tracked generic member', () => {
      const catalog = makeCatalog()

      const expected = catalog.generic.tracked1_2
      const actual = util.findApiInCatalog('tracked_api1', 'tracked_stage2', catalog)

      expect(actual).toBe(expected)
    })

    test('finds an existing untracked generic member', () => {
      const catalog = makeCatalog()

      const expected = catalog.generic.untracked1
      const actual = util.findApiInCatalog('untracked_api1', undefined, catalog)

      expect(actual).toBe(expected)
    })

    test('fails when no such ID exists', () => {
      const catalog = makeCatalog()

      const expected = null
      const actual = util.findApiInCatalog('plan15_api1', 'stage1', catalog)

      expect(actual).toBe(expected)
    })
  })

  describe('catalog()', () => {
    const originalGetObject = util.s3.getObject
    const originalConsoleError = console.error
    const setEnv = bindEnv()

    afterEach(() => {
      util.s3.getObject = originalGetObject
      console.error = originalConsoleError
    })

    test('successfully finds catalog from bucket', async () => {
      const catalog = makeCatalog()
      const response = {
        Body: JSON.stringify(catalog)
      }

      util.s3.getObject = jest.fn().mockReturnValue(promiser(response))

      setEnv('StaticBucketName', 'test-bucket')
      setEnv('SourceAccount', '123412341234')

      const result = await util.catalog()

      expect(util.s3.getObject).toBeCalledTimes(1)
      expect(util.s3.getObject).toBeCalledWith(
        expect.objectContaining({ Bucket: 'test-bucket', Key: 'catalog.json', ExpectedBucketOwner: '123412341234' })
      )
      expect(result).toMatchObject(catalog)
    })

    test('handles key absence gracefully', async () => {
      const catalog = {
        apiGateway: [],
        generic: {}
      }
      const response = {
        code: 'NoSuchKey'
      }

      util.s3.getObject = jest.fn().mockReturnValue(promiser(null, response))

      setEnv('StaticBucketName', 'test-bucket')
      setEnv('SourceAccount', '123412341234')

      // Suppress error messages - we're expecting an error here.
      console.error = () => {}

      const result = await util.catalog()

      expect(util.s3.getObject).toBeCalledTimes(1)
      expect(util.s3.getObject).toBeCalledWith(
        expect.objectContaining({ Bucket: 'test-bucket', Key: 'catalog.json', ExpectedBucketOwner: '123412341234' })
      )
      expect(result).toMatchObject(catalog)
    })

    test('propagates other errors', async () => {
      const response = {
        code: 'UnknownError'
      }

      util.s3.getObject = jest.fn().mockReturnValue(promiser(null, response))

      setEnv('StaticBucketName', 'test-bucket')
      setEnv('SourceAccount', '123412341234')

      // Suppress error messages - we're expecting an error here.
      console.error = () => {}

      await expect(util.catalog()).rejects.toBe(response)

      expect(util.s3.getObject).toBeCalledTimes(1)
      expect(util.s3.getObject).toBeCalledWith(
        expect.objectContaining({ Bucket: 'test-bucket', Key: 'catalog.json', ExpectedBucketOwner: '123412341234' })
      )
    })
  })
})
