const util = require('../../../util')
const { promiser, generateRequestContext, generateResponseContext } = require('../../../../setup-jest')
const catalogExport = require('../../../routes/catalog/export')

const originalCatalog = util.catalog

describe('GET /catalog/:apiId/export', () => {
  beforeEach(() => {
    util.catalog = jest.fn()
  })

  afterEach(() => {
    util.catalog = originalCatalog
  })

  test('it should return a generated API export, proxying through params', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()

    req.params = { id: 'apiId_stageName' }
    req.query = {}
    req.query = { exportType: 'oas30', parameters: { serviceName: 'my-new-openapi-service' } }

    util.apigateway.getExport = jest.fn().mockReturnValue(promiser({
      body: Buffer.from('returnedSDK')
    }))

    util.catalog.mockReturnValue({
      apiGateway: [
        {
          apis: [
            {
              apiId: 'apiId',
              apiStage: 'stageName',
              sdkGeneration: true
            }
          ]
        }
      ],
      generic: {}
    })

    await catalogExport.get(req, res)

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getExport).toHaveBeenCalledTimes(1)
    expect(util.apigateway.getExport).toHaveBeenCalledWith({
      restApiId: 'apiId',
      exportType: 'oas30',
      stageName: 'stageName',
      parameters: { serviceName: 'my-new-openapi-service' }
    })

    expect(res.send).toHaveBeenCalledTimes(1)
    expect(res.send.mock.calls[0][0]).toBeInstanceOf(Buffer)
  })

  test('it should not return SDKs for APIs not in the catalog', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()

    req.params = { id: 'anApi_notInTheCatalog' }
    req.query = { exportType: 'oas30', parameters: { serviceName: 'my-new-openapi-service' } }

    util.catalog.mockReturnValue({
      apiGateway: [
        {
          apis: [
            {
              apiId: 'apiId',
              apiStage: 'stageName',
              sdkGeneration: true
            }
          ]
        }
      ],
      generic: {}
    })

    await catalogExport.get(req, res)

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getExport).toHaveBeenCalledTimes(0)

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({ message: 'API with ID (anApi) and Stage (notInTheCatalog) could not be found.' })
  })

  test('it should not return SDKs for APIs in the catalog but with API export generation disabled', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()

    req.params = { id: 'thisApi_shouldNotGenerateSDKs' }
    req.query = {}
    req.query.exportType = 'whitespace'
    req.query = { exportType: 'oas30', parameters: { serviceName: 'my-new-openapi-service' } }

    util.catalog.mockReturnValue({
      apiGateway: [
        {
          apis: [
            {
              apiId: 'apiId',
              apiStage: 'stageName',
              sdkGeneration: true
            },
            {
              apiId: 'thisApi',
              apiStage: 'shouldNotGenerateSDKs',
              sdkGeneration: false
            }
          ]
        }
      ],
      generic: {}
    })

    await catalogExport.get(req, res)

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getExport).toHaveBeenCalledTimes(0)

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({ message: 'API with ID (thisApi) and Stage (shouldNotGenerateSDKs) is not enabled for API export generation.' })
  })
})
