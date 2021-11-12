const fs = require('fs')
const path = require('path')
const index = require('../index')
const { promiser, bindMock, bindEnv } = require('../../setup-jest')

describe('swaggerFileFilter', () => {
  test('should only process JSON or YAML files in the catalog directory', () => {
    expect(index.swaggerFileFilter({ Key: 'catalog/swagger.json' })).toBe(true)
    expect(index.swaggerFileFilter({ Key: 'catalog/swagger.yaml' })).toBe(true)
    expect(index.swaggerFileFilter({ Key: 'catalog/swagger.yml' })).toBe(true)
    expect(index.swaggerFileFilter({ Key: 'catalog/swagger.json/nested-swagger-counts-too.json' })).toBe(true)
    expect(index.swaggerFileFilter({ Key: 'catalog/not-swagger.json/fakeout' })).toBe(false)
    expect(index.swaggerFileFilter({ Key: 'catalog/not-swagger' })).toBe(false)
    expect(index.swaggerFileFilter({ Key: 'catalog/not-swagger.json.misleading' })).toBe(false)
  })
})

describe('getSwaggerFile', () => {
  const setMock = bindMock()

  test('should recognize generic swagger files after fetching them from S3', async () => {
    // generic swagger is swagger not managed by api gateway; we detect this based on it not having any
    // x-amazon-apigateway-integration fields in the path

    const fileBody = fs.readFileSync(path.join(__dirname, '/generic-swagger.json'))

    setMock(index.s3, 'getObject').mockReturnValueOnce(promiser({ Body: fileBody }))

    const internalRepr = await index.getSwaggerFile({ Key: 'catalog/swagger.json' })

    expect(internalRepr.id).toBe(index.hash(JSON.parse(fileBody.toString())))
    expect(internalRepr.apiId).toBeUndefined()
    expect(internalRepr.apiStage).toBeUndefined()
    expect(internalRepr.generic).toBe(true)
    expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
  })

  test('should recognize swagger files saved in apiId_stageName format after fetching them from S3', async () => {
    // the admin panel uploads files in this format; we then read them and build them into the catalog
    const fileBody = fs.readFileSync(path.join(__dirname, '/api-gateway-swagger.json'))

    setMock(index.s3, 'getObject').mockReturnValueOnce(promiser({ Body: fileBody }))

    const internalRepr = await index.getSwaggerFile({ Key: 'catalog/a1b2c3d4e5_stagename.json' })

    expect(internalRepr.id).toBe(index.hash(JSON.parse(fileBody.toString())))
    expect(internalRepr.apiId).toBe('a1b2c3d4e5')
    expect(internalRepr.apiStage).toBe('stagename')
    expect(internalRepr.generic).toBe(false)
    expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
  })

  test('should not recognize exported swagger files after fetching them from S3', async () => {
    // we used to automatically detect exported swagger files by reading into their host and basePath fields
    // we no longer do this, and this test serves to confirm that we do not automatically detect if a swagger file
    // was exported from API GW. this makes cross-account generic APIs easier, and prevents the admin panel's
    // "make visible" from accidentally promoting exported-but-intended-to-be-generic swagger files into apiGateway
    // managed files

    const fileBody = fs.readFileSync(path.join(__dirname, '/api-gateway-swagger.json'))

    setMock(index.s3, 'getObject').mockReturnValueOnce(promiser({ Body: fileBody }))

    const internalRepr = await index.getSwaggerFile({ Key: 'catalog/normal-exported-swagger.json' })

    expect(internalRepr.id).toBe(index.hash(JSON.parse(fileBody.toString())))
    expect(internalRepr.apiId).toBeUndefined()
    expect(internalRepr.apiStage).toBeUndefined()
    expect(internalRepr.generic).toBe(true)
    expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
  })

  test('should recognize generic OAS3 files after fetching them from S3', async () => {
    // generic swagger is OAS3 not managed by api gateway; we detect this based on it not having any
    // x-amazon-apigateway-integration fields in the path

    const fileBody = fs.readFileSync(path.join(__dirname, '/generic-oas3.json'))

    setMock(index.s3, 'getObject').mockReturnValueOnce(promiser({ Body: fileBody }))

    const internalRepr = await index.getSwaggerFile({ Key: 'catalog/swagger.json' })

    expect(internalRepr.id).toBe(index.hash(JSON.parse(fileBody.toString())))
    expect(internalRepr.apiId).toBeUndefined()
    expect(internalRepr.apiStage).toBeUndefined()
    expect(internalRepr.generic).toBe(true)
    expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
  })

  test('should recognize OAS3 files saved in apiId_stageName format after fetching them from S3', async () => {
    // the admin panel uploads files in this format; we then read them and build them into the catalog
    const fileBody = fs.readFileSync(path.join(__dirname, '/api-gateway-oas3.json'))

    setMock(index.s3, 'getObject').mockReturnValueOnce(promiser({ Body: fileBody }))

    const internalRepr = await index.getSwaggerFile({ Key: 'catalog/a1b2c3d4e5_oasstagename.json' })

    expect(internalRepr.id).toBe(index.hash(JSON.parse(fileBody.toString())))
    expect(internalRepr.apiId).toBe('a1b2c3d4e5')
    expect(internalRepr.apiStage).toBe('oasstagename')
    expect(internalRepr.generic).toBe(false)
    expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
  })

  test('should not recognize exported OAS3 files after fetching them from S3', async () => {
    // we used to automatically detect exported swagger files by reading into their host and basePath fields
    // we no longer do this, and this test serves to confirm that we do not automatically detect if a swagger file
    // was exported from API GW. this makes cross-account generic APIs easier, and prevents the admin panel's
    // "make visible" from accidentally promoting exported-but-intended-to-be-generic swagger files into apiGateway
    // managed files

    const fileBody = fs.readFileSync(path.join(__dirname, '/api-gateway-oas3.json'))

    setMock(index.s3, 'getObject').mockReturnValueOnce(promiser({ Body: fileBody }))

    const internalRepr = await index.getSwaggerFile({ Key: 'catalog/normal-exported-oas3.json' })

    expect(internalRepr.id).toBe(index.hash(JSON.parse(fileBody.toString())))
    expect(internalRepr.apiId).toBeUndefined()
    expect(internalRepr.apiStage).toBeUndefined()
    expect(internalRepr.generic).toBe(true)
    expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
  })
})

describe('handler', () => {
  const setMock = bindMock()
  const setEnv = bindEnv()

  test('should generate a correct catalog object from api gateway\'s usage plan and upload it', async () => {
    const usagePlan = {
      id: 'a1b2c3',
      name: 'Basic',
      throttle: { rateLimit: 100.0, burstLimit: 10 },
      quota: { limit: 5, period: 'MONTH', offset: 0 },
      apiStages: [{ apiId: 'a1b2c3d4e5', stage: 'prod' }]
    }
    const files = {
      'catalog/a1b2c3d4e5_prod.json': {
        openapi: '3.0.0',
        info: { version: '1', title: 'prodSwaggerBody' },
        paths: {}
      },
      'catalog/a1b2c3d4e5_gamma.json': {
        openapi: '3.0.0',
        info: { version: '1', title: 'gammaSwaggerBody' },
        paths: {}
      },
      'catalog/somehugehash.json': {
        openapi: '3.0.0',
        info: { version: '1', title: 'genericSwaggerBody' },
        paths: {}
      },
      'sdkGeneration.json': {}
    }
    // NOTE: the order of this matters for the assertion - don't change it unless you know what
    // you're doing.
    const expectedCatalog = {
      apiGateway: [
        {
          id: 'a1b2c3',
          name: 'Basic',
          throttle: {
            rateLimit: 100,
            burstLimit: 10
          },
          quota: {
            limit: 5,
            period: 'MONTH',
            offset: 0
          },
          apis: [
            {
              id: 'a1b2c3d4e5',
              apiId: 'a1b2c3d4e5',
              apiStage: 'prod',
              sdkGeneration: false,
              swagger: files['catalog/a1b2c3d4e5_prod.json']
            }
          ]
        }
      ],
      generic: [
        {
          id: 'a1b2c3d4e5',
          apiId: 'a1b2c3d4e5',
          apiStage: 'gamma',
          sdkGeneration: false,
          swagger: files['catalog/a1b2c3d4e5_gamma.json']
        },
        {
          id: index.hash(files['catalog/somehugehash.json']),
          sdkGeneration: false,
          swagger: files['catalog/somehugehash.json']
        }
      ]
    }

    setMock(index.apiGateway, 'getUsagePlans', () => promiser({ items: [usagePlan] }))
    setMock(index.s3, 'listObjectsV2', () =>
      promiser({ Contents: Object.keys(files).filter(key => key.startsWith('catalog/')).map(Key => ({ Key })) })
    )
    setMock(index.s3, 'getObject', opts => promiser({ Body: Buffer.from(JSON.stringify(files[opts.Key])) }))
    setMock(index.s3, 'upload', () => promiser())
    setEnv('BucketName', 'TestBucket')
    setEnv('SourceAccount', '123412341234')

    await index.handler({})
    expect(index.s3.upload).toBeCalledWith({
      Bucket: 'TestBucket',
      Key: 'catalog.json',
      Body: JSON.stringify(expectedCatalog),
      ContentType: 'application/json',
      ExpectedBucketOwner: '123412341234'
    })
  })
})

describe('CatalogBuilder', () => {
  const makeApi = (title, id, apiStage, sdkGeneration = false) => {
    return { id, swagger: { openapi: '3.0.0', info: { version: '1.0.0', title }, paths: {} }, apiId: apiStage != null ? id : undefined, apiStage, sdkGeneration }
  }
  const makeSwagger = (title, id, apiStage) => {
    return { id, body: { openapi: '3.0.0', info: { version: '1.0.0', title }, paths: {} }, apiId: apiStage != null ? id : undefined, apiStage, generic: apiStage == null }
  }
  const prodApi = makeApi('prodSwaggerBody', 'a1b2c3d4e5', 'prod')
  const gammaApi = makeApi('gammaSwaggerBody', 'a1b2c3d4e5', 'gamma')
  const otherApi = makeApi('otherSwaggerBody', 'a1b2c3d4e5', 'delta')
  const genericApi = makeApi('genericSwaggerBody', 'a1b2c3d4e5f6a1b2c3d4e5f6')

  // These are mutated, hence why they're thunks
  const prodSwagger = () => makeSwagger('prodSwaggerBody', 'a1b2c3d4e5', 'prod')
  const gammaSwagger = () => makeSwagger('gammaSwaggerBody', 'a1b2c3d4e5', 'gamma')
  const otherSwagger = () => makeSwagger('otherSwaggerBody', 'a1b2c3d4e5', 'delta')
  const genericSwagger = () => makeSwagger('genericSwaggerBody', 'a1b2c3d4e5f6a1b2c3d4e5f6')

  const usagePlans = [
    {
      id: 'MYID',
      name: 'My Usage Plan',
      throttle: 1000,
      quota: 100000,
      apiStages: [
        { apiId: 'a1b2c3d4e5', stage: 'prod' },
        { apiId: 'a1b2c3d4e5', stage: 'gamma' }
      ]
    }
  ]

  test('correctly adds mixed apis to catalog', async () => {
    const swaggerFileReprs = [
      // API Gateway-generated, in usage plan
      prodSwagger(),
      gammaSwagger(),
      // API Gateway-generated, not in usage plan
      otherSwagger(),
      // Not API Gateway-generated (as in, generic)
      genericSwagger()
    ]

    const builder = new index.CatalogBuilder(usagePlans, {})
    for (const swagger of swaggerFileReprs) {
      builder.addToCatalog(swagger)
    }

    expect(builder.catalog.apiGateway).toEqual([
      {
        id: 'MYID',
        name: 'My Usage Plan',
        throttle: 1000,
        quota: 100000,
        apis: [
          prodApi,
          gammaApi
        ]
      }
    ])
    expect(builder.catalog.generic).toEqual([
      otherApi,
      genericApi
    ])
  })

  test('correctly handles only managed generic swaggerFileReprs', async () => {
    const swaggerFileReprs = [
      otherSwagger()
    ]

    const builder = new index.CatalogBuilder(usagePlans, {})
    for (const swagger of swaggerFileReprs) {
      builder.addToCatalog(swagger)
    }

    expect(builder.catalog.apiGateway).toEqual([])
    expect(builder.catalog.generic).toEqual([
      otherApi
    ])
  })

  test('correctly handles only unmanaged generic swaggerFileReprs', async () => {
    const swaggerFileReprs = [
      genericSwagger()
    ]

    const builder = new index.CatalogBuilder(usagePlans, {})
    for (const swagger of swaggerFileReprs) {
      builder.addToCatalog(swagger)
    }

    expect(builder.catalog.apiGateway).toEqual([])
    expect(builder.catalog.generic).toEqual([
      genericApi
    ])
  })

  test('correctly handles empty swaggerFileReprs', async () => {
    const swaggerFileReprs = []

    const builder = new index.CatalogBuilder(usagePlans, {})
    for (const swagger of swaggerFileReprs) {
      builder.addToCatalog(swagger)
    }

    expect(builder.catalog.apiGateway).toEqual([])
    expect(builder.catalog.generic).toEqual([])
  })
})

describe('copyAnyMethod', () => {
  test('correctly copies ANY methods to other methods in swagger documents', async () => {
    const fileBody = JSON.parse(fs.readFileSync(path.join(__dirname, '/swagger-ANY-method.json'), 'utf8'))
    const anyMethod = fileBody.paths['/']['x-amazon-apigateway-any-method']
    index.copyAnyMethod(fileBody)

    expect(fileBody.paths['/']).toEqual({
      get: anyMethod,
      post: anyMethod,
      put: anyMethod,
      delete: anyMethod,
      patch: anyMethod,
      head: anyMethod,
      options: anyMethod
    })
  })

  test('does NOT replace already existant methods with ANY in swagger documents', async () => {
    const fileBody = JSON.parse(fs.readFileSync(path.join(__dirname, '/swagger-ANY+GET-methods.json'), 'utf8'))
    const getMethod = fileBody.paths['/'].get
    const anyMethod = fileBody.paths['/']['x-amazon-apigateway-any-method']
    index.copyAnyMethod(fileBody)

    expect(fileBody.paths['/']).toEqual({
      // don't replace get
      get: getMethod,

      // add everything else
      post: anyMethod,
      put: anyMethod,
      delete: anyMethod,
      patch: anyMethod,
      head: anyMethod,
      options: anyMethod
    })
  })

  test('correctly copies ANY methods to other methods in oas3 documents', async () => {
    const fileBody = JSON.parse(fs.readFileSync(path.join(__dirname, '/oas3-ANY-method.json'), 'utf8'))
    const anyMethod = fileBody.paths['/']['x-amazon-apigateway-any-method']
    index.copyAnyMethod(fileBody)

    expect(fileBody.paths['/']).toEqual({
      get: anyMethod,
      post: anyMethod,
      put: anyMethod,
      delete: anyMethod,
      patch: anyMethod,
      head: anyMethod,
      options: anyMethod
    })
  })

  test('does NOT replace already existant methods with ANY in oas3 documents', async () => {
    const fileBody = JSON.parse(fs.readFileSync(path.join(__dirname, '/oas3-ANY+GET-methods.json'), 'utf8'))
    const getMethod = fileBody.paths['/'].get
    const anyMethod = fileBody.paths['/']['x-amazon-apigateway-any-method']
    index.copyAnyMethod(fileBody)

    expect(fileBody.paths['/']).toEqual({
      // don't replace get
      get: getMethod,

      // add everything else
      post: anyMethod,
      put: anyMethod,
      delete: anyMethod,
      patch: anyMethod,
      head: anyMethod,
      options: anyMethod
    })
  })
})
