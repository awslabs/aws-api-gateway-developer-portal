const handlers = require('../express-route-handlers')
const apigateway = require('../express-route-handlers').apigateway
const promiser = require('../../setup-jest').promiser
const generateResponseContext = require('../../setup-jest').generateResponseContext
const generateRequestContext = require('../../setup-jest').generateRequestContext

let catalog = require('../catalog/index')

jest.mock('../catalog/index')

describe('getSdk', () => {
    test('it should return a generated SDK, proxying through params', async () => {
        let req = generateRequestContext(),
            res = generateResponseContext()

        req.params = { id: 'apiId_stageName' }
        req.query = {}
        req.query = { sdkType: 'ruby', parameters: { serviceName: 'my-new-ruby-service' } }

        apigateway.getSdk = jest.fn().mockReturnValue(promiser({
            body: Buffer.from('returnedSDK')
        }))

        catalog.mockReturnValue({
            apiGateway: [
                {
                    apis: [
                        {
                            id: 'apiId',
                            stage: 'stageName',
                            sdkGeneration: true
                        }
                    ]
                }
            ],
            generic: {}
        })

        await handlers.getSdk(req, res)

        expect(catalog).toHaveBeenCalledTimes(1)

        expect(apigateway.getSdk).toHaveBeenCalledTimes(1)
        expect(apigateway.getSdk).toHaveBeenCalledWith({
            restApiId: 'apiId',
            sdkType: 'ruby',
            stageName: 'stageName',
            parameters: { serviceName: 'my-new-ruby-service' }
        })

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send.mock.calls[0][0]).toContain('data:application/zip;base64,')
    })

    test('it should not return SDKs for APIs not in the catalog', async () => {
        let req = generateRequestContext(),
            res = generateResponseContext()

        req.params = { id: 'anApi_notInTheCatalog' }
        req.query = { sdkType: 'ruby', parameters: { serviceName: 'my-new-ruby-service' } }

        catalog.mockReturnValue({
            apiGateway: [
                {
                    apis: [
                        {
                            id: 'apiId',
                            stage: 'stageName',
                            sdkGeneration: true
                        }
                    ]
                }
            ],
            generic: {}
        })

        await handlers.getSdk(req, res)

        expect(catalog).toHaveBeenCalledTimes(1)

        expect(apigateway.getSdk).toHaveBeenCalledTimes(0)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.status().json).toHaveBeenCalledTimes(1)
        expect(res.status().json).toHaveBeenCalledWith({ message: `API with ID (anApi) and Stage (notInTheCatalog) could not be found.` })
    })

    test('it should not return SDKs for APIs in the catalog but with SDK generation disabled', async () => {
        let req = generateRequestContext(),
            res = generateResponseContext()

        req.params = { id: 'thisApi_shouldNotGenerateSDKs' }
        req.query = {}
        req.query.sdkType = 'whitespace'
        req.query = { sdkType: 'ruby', parameters: { serviceName: 'my-new-ruby-service' } }

        catalog.mockReturnValue({
            apiGateway: [
                {
                    apis: [
                        {
                            id: 'apiId',
                            stage: 'stageName',
                            sdkGeneration: true
                        },
                        {
                            id: 'thisApi',
                            stage: 'shouldNotGenerateSDKs',
                            sdkGeneration: false
                        }
                    ]
                }
            ],
            generic: {}
        })

        await handlers.getSdk(req, res)

        expect(catalog).toHaveBeenCalledTimes(1)

        expect(apigateway.getSdk).toHaveBeenCalledTimes(0)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.status().json).toHaveBeenCalledTimes(1)
        expect(res.status().json).toHaveBeenCalledWith({ message: `API with ID (thisApi) and Stage (shouldNotGenerateSDKs) is not enabled for SDK generation.` })
    })
})