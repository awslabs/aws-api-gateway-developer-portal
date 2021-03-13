const util = require('../../../util')
const { promiser, invoke, response, generateEvent } = require('../../../../setup-jest')
const catalogSdk = require('../../../routes/catalog/sdk')

const originalCatalog = util.catalog

describe('GET /catalog/:apiId/sdk', () => {
  beforeEach(() => {
    util.catalog = jest.fn()
  })

  afterEach(() => {
    util.catalog = originalCatalog
  })

  test('it should return a generated SDK, proxying through params', async () => {
    util.apigateway.getSdk = jest.fn().mockReturnValue(promiser({
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

    const result = await invoke(e => catalogSdk.get(e, 'apiId_stageName'), generateEvent({
      query: { sdkType: 'ruby', parameters: { serviceName: 'my-new-ruby-service' } }
    }))

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getSdk).toHaveBeenCalledTimes(1)
    expect(util.apigateway.getSdk).toHaveBeenCalledWith({
      restApiId: 'apiId',
      sdkType: 'ruby',
      stageName: 'stageName',
      parameters: { serviceName: 'my-new-ruby-service' }
    })

    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'content-type': 'application/zip'
      },
      body: Buffer.from('returnedSDK').toString('base64')
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

    const result = await invoke(e => catalogSdk.get(e, 'anApi_notInTheCatalog'), generateEvent({
      query: { sdkType: 'ruby', parameters: { serviceName: 'my-new-ruby-service' } }
    }))

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getSdk).toHaveBeenCalledTimes(0)

    expect(result).toEqual(response(404, { message: 'API with ID (anApi) and Stage (notInTheCatalog) could not be found.' }))
  })

  test('it should not return SDKs for APIs in the catalog but with SDK generation disabled', async () => {
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

    const result = await invoke(e => catalogSdk.get(e, 'thisApi_shouldNotGenerateSDKs'), generateEvent({
      query: { sdkType: 'ruby', parameters: { serviceName: 'my-new-ruby-service' } }
    }))

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getSdk).toHaveBeenCalledTimes(0)

    expect(result).toEqual(response(403, { message: 'API with ID (thisApi) and Stage (shouldNotGenerateSDKs) is not enabled for SDK generation.' }))
  })
})
