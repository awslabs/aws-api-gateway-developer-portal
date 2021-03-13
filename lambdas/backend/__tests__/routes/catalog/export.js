const util = require('../../../util')
const { promiser, invoke, response, generateEvent } = require('../../../../setup-jest')
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

    const result = await invoke(e => catalogExport.get(e, 'apiId_stageName'), generateEvent({
      query: { exportType: 'oas30', parameters: { serviceName: 'my-new-openapi-service' } }
    }))

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getExport).toHaveBeenCalledTimes(1)
    expect(util.apigateway.getExport).toHaveBeenCalledWith({
      restApiId: 'apiId',
      exportType: 'oas30',
      stageName: 'stageName',
      parameters: { serviceName: 'my-new-openapi-service' }
    })

    expect(result).toEqual({
      statusCode: 200,
      body: Buffer.from('returnedSDK').toString('base64'),
      headers: {
        'response-type': 'application/zip'
      }
    })
  })

  test('it should not return SDKs for APIs not in the catalog', async () => {
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

    const result = await invoke(e => catalogExport.get(e, 'anApi_notInTheCatalog'), generateEvent({
      query: { exportType: 'oas30', parameters: { serviceName: 'my-new-openapi-service' } }
    }))

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getExport).toHaveBeenCalledTimes(0)

    expect(result).toEqual(response(404, { message: 'API with ID (anApi) and Stage (notInTheCatalog) could not be found.' }))
  })

  test('it should not return SDKs for APIs in the catalog but with API export generation disabled', async () => {
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

    const result = await invoke(e => catalogExport.get(e, 'thisApi_shouldNotGenerateSDKs'), generateEvent({
      query: { exportType: 'oas30', parameters: { serviceName: 'my-new-openapi-service' } }
    }))

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getExport).toHaveBeenCalledTimes(0)

    expect(result).toEqual(response(403, { message: 'API with ID (thisApi) and Stage (shouldNotGenerateSDKs) is not enabled for API export generation.' }))
  })
})
