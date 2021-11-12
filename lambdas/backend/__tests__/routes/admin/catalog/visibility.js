const util = require('../../../../util')
const promiser = require('../../../../../setup-jest').promiser
const hash = require('object-hash')
const adminCatalogVisibility = require('../../../../routes/admin/catalog/visibility')

const originalCatalog = util.catalog

const mockResponseObject = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
}

function generateRequestContext () {
  return {
    apiGateway: {
      event: {
        requestContext: {
          identity: {
            cognitoIdentityId: 'qwertyuiop'
          }
        }
      }
    }
  }
}

describe('GET /admin/catalog/visibility', () => {
  beforeEach(() => {
    util.catalog = jest.fn()
  })

  afterEach(() => {
    util.catalog = originalCatalog
  })

  test('returns a description of the catalog with visibility', async () => {
    util.catalog.mockReturnValue(Promise.resolve({
      apiGateway: [
        {
          id: 'aaaaaa',
          name: 'basic usage plan',
          apis: [
            {
              apiId: 'a1b2c3',
              apiStage: 'gamma',
              swagger: {}
            },
            {
              apiId: 'a1b2c3',
              apiStage: 'prod',
              swagger: {}
            }
          ]
        },
        {
          id: 'bbbbbb',
          name: 'advanced usage plan',
          apis: [
            {
              apiId: 'd1e2f3',
              apiStage: 'def',
              swagger: {}
            },
            {
              apiId: 'g1h2i3',
              apiStage: 'ghi',
              swagger: {}
            }
          ]
        }
      ],
      generic: [
        {
          id: '1234567890',
          swagger: { info: { title: '' } }
        }
      ]
    }))

    util.apigateway.getRestApis = jest.fn().mockReturnValue(promiser({
      items: [
        {
          id: 'a1b2c3',
          name: 'first'
        },
        {
          id: 'd1e2f3',
          name: 'second'
        },
        {
          id: 'g1h1i1',
          name: 'third'
        },
        {
          id: 'j1k2l3',
          name: 'fourth'
        }
      ]
    }))

    util.apigateway.getStages = jest.fn()
      .mockReturnValueOnce(promiser({
        item: [
          {
            id: 'a1b2c3',
            name: 'first',
            stageName: 'gamma'
          },
          {
            id: 'a1b2c3',
            name: 'first',
            stageName: 'prod'
          },
          {
            id: 'a1b2c3',
            name: 'first',
            stageName: 'exclude'
          }
        ]
      }))
      .mockReturnValueOnce(promiser({
        item: [
          {
            id: 'd1e2f3',
            name: 'second',
            stageName: 'def'
          }
        ]
      }))
      .mockReturnValueOnce(promiser({
        item: [
          {
            id: 'g1h1i1',
            name: 'third',
            stageName: 'ghi'
          }
        ]
      }))
      .mockReturnValue(promiser({
        item: [
          {
            id: 'j1k2l3',
            name: 'fourth',
            stageName: 'exclude'
          }
        ]
      }))

    util.apigateway.getUsagePlans = jest.fn()
      .mockReturnValue(promiser({
        items: [
          {
            id: 'z1x2c3',
            name: 'basic',
            apiStages: [
              {
                apiId: 'a1b2c3',
                stage: 'gamma'
              },
              {
                apiId: 'a1b2c3',
                stage: 'exclude'
              }
            ]
          },
          {
            id: 'b1n2m3',
            name: 'advanced',
            apiStages: [
              {
                apiId: 'd1e2f3',
                stage: 'def'
              }
            ]
          }
        ]
      }))

    await adminCatalogVisibility.get(generateRequestContext(), mockResponseObject)

    expect(util.apigateway.getRestApis).toHaveBeenCalledTimes(1)
    expect(util.apigateway.getStages).toHaveBeenCalledTimes(4)
    expect(mockResponseObject.status).toHaveBeenCalledWith(200)
    expect(mockResponseObject.json).toHaveBeenCalledWith({
      apiGateway: [
        {
          id: 'a1b2c3',
          stage: 'gamma',
          visibility: true,
          subscribable: true,
          name: 'first',
          usagePlanId: 'z1x2c3',
          usagePlanName: 'basic',
          sdkGeneration: false
        },
        {
          id: 'a1b2c3',
          stage: 'prod',
          visibility: true,
          subscribable: false,
          name: 'first',
          sdkGeneration: false
        },
        {
          id: 'a1b2c3',
          stage: 'exclude',
          visibility: false,
          subscribable: true,
          name: 'first',
          usagePlanId: 'z1x2c3',
          usagePlanName: 'basic',
          sdkGeneration: false
        },
        {
          id: 'd1e2f3',
          stage: 'def',
          visibility: true,
          subscribable: true,
          name: 'second',
          usagePlanId: 'b1n2m3',
          usagePlanName: 'advanced',
          sdkGeneration: false
        },
        {
          id: 'g1h1i1',
          stage: 'ghi',
          visibility: false,
          subscribable: false,
          name: 'third',
          sdkGeneration: false
        },
        {
          id: 'j1k2l3',
          stage: 'exclude',
          visibility: false,
          subscribable: false,
          name: 'fourth',
          sdkGeneration: false
        }
      ],
      generic: {
        1234567890: {
          visibility: true,
          name: 'Untitled'
        }
      }
    })
  })

  test('includes unsubscribable API Gateway-managed APIs with subscribable ones', async () => {
    util.catalog.mockReturnValue(Promise.resolve({
      apiGateway: [
        {
          id: 'aaaaaa',
          name: 'basic usage plan',
          apis: [
            {
              apiId: 'a1b2c3',
              apiStage: 'prod',
              swagger: {}
            }
          ]
        }
      ],
      generic: [
        {
          apiId: 'd1e2f3',
          apiStage: 'prod',
          swagger: {}
        }
      ]
    }))

    util.apigateway.getRestApis = jest.fn().mockReturnValue(promiser({
      items: [
        {
          id: 'a1b2c3',
          name: 'first'
        },
        {
          id: 'd1e2f3',
          name: 'second'
        }
      ]
    }))

    util.apigateway.getStages = jest.fn()
      .mockReturnValueOnce(promiser({
        item: [
          {
            id: 'a1b2c3',
            name: 'first',
            stageName: 'prod'
          },
          {
            id: 'a1b2c3',
            name: 'first',
            stageName: 'exclude'
          }
        ]
      }))
      .mockReturnValueOnce(promiser({
        item: [
          {
            id: 'd1e3f3',
            name: 'second',
            stageName: 'prod'
          },
          {
            id: 'd1e3f3',
            name: 'second',
            stageName: 'exclude'
          }
        ]
      }))

    util.apigateway.getUsagePlans = jest.fn()
      .mockReturnValue(promiser({
        items: [
          {
            id: 'z1x2c3',
            name: 'basic',
            apiStages: [
              {
                apiId: 'a1b2c3',
                stage: 'prod'
              },
              {
                apiId: 'a1b2c3',
                stage: 'exclude'
              }
            ]
          }
        ]
      }))

    await adminCatalogVisibility.get(generateRequestContext(), mockResponseObject)

    expect(util.apigateway.getRestApis).toHaveBeenCalledTimes(1)
    expect(util.apigateway.getStages).toHaveBeenCalledTimes(2)
    expect(mockResponseObject.status).toHaveBeenCalledWith(200)
    expect(mockResponseObject.json).toHaveBeenCalledWith({
      apiGateway: [
        {
          id: 'a1b2c3',
          stage: 'prod',
          visibility: true,
          subscribable: true,
          name: 'first',
          usagePlanId: 'z1x2c3',
          usagePlanName: 'basic',
          sdkGeneration: false
        },
        {
          id: 'a1b2c3',
          stage: 'exclude',
          visibility: false,
          subscribable: true,
          name: 'first',
          usagePlanId: 'z1x2c3',
          usagePlanName: 'basic',
          sdkGeneration: false
        },
        {
          id: 'd1e2f3',
          stage: 'prod',
          visibility: true,
          subscribable: false,
          name: 'second',
          sdkGeneration: false
        },
        {
          id: 'd1e2f3',
          stage: 'exclude',
          visibility: false,
          subscribable: false,
          name: 'second',
          sdkGeneration: false
        }
      ]
    })
  })
})

describe('POST /admin/catalog/visibility', () => {
  beforeEach(() => {
    util.catalog = jest.fn()
  })

  afterEach(() => {
    util.catalog = originalCatalog
  })

  test('exports and uploads swagger doc for subscribable api gateway managed apis', async () => {
    const req = generateRequestContext()
    req.body = { apiKey: 'a1b2c3_prod', subscribable: 'true' }

    util.apigateway.getExport = jest.fn().mockReturnValue(promiser({
      body: Buffer.from(JSON.stringify({
        info: { title: 'swagger document' }
      }))
    }))

    util.s3.upload = jest.fn().mockReturnValue(promiser())
    util.lambda.invoke = jest.fn().mockReturnValue(promiser())

    process.env.StaticBucketName = 'myBucket'
    process.env.SourceAccount = '123412341234'

    await adminCatalogVisibility.post(req, mockResponseObject)

    expect(util.apigateway.getExport).toHaveBeenCalledWith({
      restApiId: 'a1b2c3',
      stageName: 'prod',
      exportType: 'swagger',
      parameters: {
        extensions: 'apigateway'
      }
    })

    expect(util.s3.upload).toHaveBeenCalledWith({
      Bucket: 'myBucket',
      Key: 'catalog/a1b2c3_prod.json',
      Body: Buffer.from(JSON.stringify({
        info: { title: 'swagger document' }
      })),
      ExpectedBucketOwner: '123412341234'
    })

    expect(mockResponseObject.status).toHaveBeenCalledWith(200)
    expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
  })

  test('exports and uploads swagger doc for unsubscribable api gateway managed apis', async () => {
    const req = generateRequestContext()
    req.body = { apiKey: 'a1b2c3_prod', subscribable: 'false' }

    util.apigateway.getExport = jest.fn().mockReturnValue(promiser({
      body: Buffer.from(JSON.stringify({
        info: { title: 'swagger document' }
      }))
    }))

    util.s3.upload = jest.fn().mockReturnValue(promiser())
    util.lambda.invoke = jest.fn().mockReturnValue(promiser())

    process.env.StaticBucketName = 'myBucket'
    process.env.SourceAccount = '123412341234'

    await adminCatalogVisibility.post(req, mockResponseObject)

    expect(util.apigateway.getExport).toHaveBeenCalledWith({
      restApiId: 'a1b2c3',
      stageName: 'prod',
      exportType: 'swagger',
      parameters: {
        extensions: 'apigateway'
      }
    })

    expect(util.s3.upload).toHaveBeenCalledWith({
      Bucket: 'myBucket',
      Key: 'catalog/unsubscribable_a1b2c3_prod.json',
      Body: Buffer.from(JSON.stringify({
        info: { title: 'swagger document' }
      })),
      ExpectedBucketOwner: '123412341234'
    })

    expect(mockResponseObject.status).toHaveBeenCalledWith(200)
    expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
  })

  test('uploads swagger doc for generic apis', async () => {
    const req = generateRequestContext()
    req.body = { swagger: JSON.stringify({ info: { title: 'swagger document' } }) }

    util.s3.upload = jest.fn().mockReturnValue(promiser())
    util.lambda.invoke = jest.fn().mockReturnValue(promiser())

    process.env.StaticBucketName = 'myPail'
    process.env.SourceAccount = '123412341234'

    await adminCatalogVisibility.post(req, mockResponseObject)

    expect(util.s3.upload).toHaveBeenCalledWith({
      Bucket: 'myPail',
      Key: `catalog/${hash({ info: { title: 'swagger document' } })}.json`,
      Body: Buffer.from(JSON.stringify({ info: { title: 'swagger document' } })),
      ExpectedBucketOwner: '123412341234'
    })

    expect(mockResponseObject.status).toHaveBeenCalledWith(200)
    expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
  })

  test('rejects requests without apiKey or swagger fields', async () => {
    const req = generateRequestContext()

    await adminCatalogVisibility.post(req, mockResponseObject)

    expect(mockResponseObject.status).toHaveBeenCalledWith(400)
    expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Invalid input' })
  })
})

describe('DELETE /admin/catalog/visibility/:id', () => {
  beforeEach(() => {
    util.catalog = jest.fn()
    util.catalog.mockReturnValue(Promise.resolve({
      apiGateway: [
        {
          apis: [
            { apiId: 'unmatched1', apiStage: 'unmatched1' },
            { apiId: 'unmatched2', apiStage: 'unmatched2' },
            { apiId: 'a1b2c3', apiStage: 'prod' }
          ]
        },
        {
          apis: [
            { apiId: 'unmatched3', apiStage: 'unmatched3' },
            { apiId: 'unmatched4', apiStage: 'unmatched4' }
          ]
        }
      ]
    }))
  })

  afterEach(() => {
    util.catalog = originalCatalog
  })

  test('deletes swagger doc from s3 for subscribable api gateway managed apis', async () => {
    const req = generateRequestContext()
    req.params = { id: 'a1b2c3_prod', subscribable: 'true' }

    util.s3.deleteObject = jest.fn().mockReturnValue(promiser())

    process.env.StaticBucketName = 'myOtherBucket'
    process.env.SourceAccount = '123412341234'

    await adminCatalogVisibility.delete(req, mockResponseObject)

    expect(util.s3.deleteObject).toHaveBeenCalledWith({
      Bucket: 'myOtherBucket',
      Key: 'catalog/unsubscribable_a1b2c3_prod.json',
      ExpectedBucketOwner: '123412341234'
    })
    expect(util.s3.deleteObject).toHaveBeenCalledWith({
      Bucket: 'myOtherBucket',
      Key: 'catalog/a1b2c3_prod.json',
      ExpectedBucketOwner: '123412341234'
    })

    expect(mockResponseObject.status).toHaveBeenCalledWith(200)
    expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
  })

  test('deletes swagger doc from s3 for unsubscribable api gateway managed apis', async () => {
    const req = generateRequestContext()
    req.params = { id: 'a1b2c3_unmatched', subscribable: 'false' }

    util.s3.deleteObject = jest.fn().mockReturnValue(promiser())

    process.env.StaticBucketName = 'myOtherBucket'
    process.env.SourceAccount = '123412341234'

    await adminCatalogVisibility.delete(req, mockResponseObject)

    expect(util.s3.deleteObject).toHaveBeenCalledWith({
      Bucket: 'myOtherBucket',
      Key: 'catalog/unsubscribable_a1b2c3_unmatched.json',
      ExpectedBucketOwner: '123412341234'
    })
    expect(util.s3.deleteObject).toHaveBeenCalledWith({
      Bucket: 'myOtherBucket',
      Key: 'catalog/a1b2c3_unmatched.json',
      ExpectedBucketOwner: '123412341234'
    })

    expect(mockResponseObject.status).toHaveBeenCalledWith(200)
    expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
  })

  test('deletes swagger doc from s3 for generic apis', async () => {
    const req = generateRequestContext()
    req.params = { genericId: 'somebighash123456' }

    util.s3.deleteObject = jest.fn().mockReturnValue(promiser())

    process.env.StaticBucketName = 'anotherBucket'
    process.env.SourceAccount = '123412341234'

    await adminCatalogVisibility.delete(req, mockResponseObject)

    expect(util.s3.deleteObject).toHaveBeenCalledWith({
      Bucket: 'anotherBucket',
      Key: 'catalog/somebighash123456.json',
      ExpectedBucketOwner: '123412341234'
    })

    expect(mockResponseObject.status).toHaveBeenCalledWith(200)
    expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
  })

  test('rejects requests without apiKey or id fields', async () => {
    const req = generateRequestContext()

    await adminCatalogVisibility.delete(req, mockResponseObject)

    expect(mockResponseObject.status).toHaveBeenCalledWith(400)
    expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Invalid input' })
  })
})
