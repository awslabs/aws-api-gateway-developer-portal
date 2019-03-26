const getAdminCatalogVisibility = require('../express-route-handlers').getAdminCatalogVisibility
const postAdminCatalogVisibility = require('../express-route-handlers').postAdminCatalogVisibility
const deleteAdminCatalogVisibility = require('../express-route-handlers').deleteAdminCatalogVisibility
const s3 = require('../express-route-handlers').s3
const apigateway = require('../express-route-handlers').apigateway
const promiser = require('../../setup-jest').promiser
const hash = require('../express-route-handlers').hash
let catalog = require('../catalog/index')

const mockResponseObject = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
}

jest.mock('../catalog/index')

function generateRequestContext() {
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

describe('getAdminCatalogVisibility', () => {
    test('returns a description of the catalog with visibility', async () => {
        catalog.mockReturnValue(Promise.resolve({
            apiGateway: [
                {
                    id: 'aaaaaa',
                    name: 'basic usage plan',
                    apis: [
                        {
                            id: 'a1b2c3',
                            stage: 'gamma',
                            swagger: {}
                        },
                        {
                            id: 'a1b2c3',
                            stage: 'prod',
                            swagger: {}
                        }
                    ]
                },
                {
                    id: 'bbbbbb',
                    name: 'advanced usage plan',
                    apis: [
                        {
                            id: 'd1e2f3',
                            stage: 'def',
                            swagger: {}
                        },
                        {
                            id: 'g1h2i3',
                            stage: 'ghi',
                            swagger: {}
                        }
                    ]
                }
            ],
            generic: [
                {
                    id: '1234567890',
                    swagger: { info: { title: '' }}
                }
            ]
        }))

        apigateway.getRestApis = jest.fn().mockReturnValue(promiser({
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

        apigateway.getStages = jest.fn()
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

        apigateway.getUsagePlans = jest.fn()
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

        await getAdminCatalogVisibility(generateRequestContext(), mockResponseObject)

        expect(apigateway.getRestApis).toHaveBeenCalledTimes(1)
        expect(apigateway.getStages).toHaveBeenCalledTimes(4)
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
})

describe('postAdminCatalogVisibility', () => {
    test('exports and uploads swagger doc for api gateway managed apis', async () => {
        let req = generateRequestContext()
        req.body = { apiKey: 'a1b2c3_prod', subscribable: true }

        apigateway.getExport = jest.fn().mockReturnValue(promiser({
            body: {
                message: 'swagger document'
            }
        }))

        s3.upload = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'myBucket'

        await postAdminCatalogVisibility(req, mockResponseObject)

        expect(apigateway.getExport).toHaveBeenCalledWith({
            restApiId: 'a1b2c3',
            stageName: 'prod',
            exportType: 'swagger',
            parameters: {
                extensions: 'apigateway'
            }
        })

        expect(s3.upload).toHaveBeenCalledWith({
            Bucket: 'myBucket',
            Key: 'catalog/a1b2c3_prod.json',
            Body: { message: 'swagger document' }
        })

        expect(mockResponseObject.status).toHaveBeenCalledWith(200)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
    })

    test('uploads swagger doc for generic apis', async () => {
        let req = generateRequestContext()
        req.body = { swagger: JSON.stringify({ message: 'swagger document' }) }

        s3.upload = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'myPail'

        await postAdminCatalogVisibility(req, mockResponseObject)

        expect(s3.upload).toHaveBeenCalledWith({
            Bucket: 'myPail',
            Key: `catalog/${hash({ message: 'swagger document' })}.json`,
            Body: JSON.stringify({ message: 'swagger document' })
        })

        expect(mockResponseObject.status).toHaveBeenCalledWith(200)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
    })

    test('rejects requests without apiKey or swagger fields', async () => {
        let req = generateRequestContext()

        await postAdminCatalogVisibility(req, mockResponseObject)

        expect(mockResponseObject.status).toHaveBeenCalledWith(400)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Invalid input' })
    })
})

describe('deleteAdminCatalogVisibility', () => {
    test('deletes swagger doc from s3 for api gateway managed apis', async () => {
        let req = generateRequestContext()
        req.params =  { id: 'a1b2c3_prod' }

        s3.deleteObject = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'myOtherBucket'

        await deleteAdminCatalogVisibility(req, mockResponseObject)

        expect(s3.deleteObject).toHaveBeenCalledWith({
            Bucket: 'myOtherBucket',
            Key: 'catalog/a1b2c3_prod.json'
        })

        expect(mockResponseObject.status).toHaveBeenCalledWith(200)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
    })

    test('deletes swagger doc from s3 for generic apis', async () => {
        let req = generateRequestContext()
        req.params = { genericId: 'somebighash123456' }

        s3.deleteObject = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'anotherBucket'

        await deleteAdminCatalogVisibility(req, mockResponseObject)

        expect(s3.deleteObject).toHaveBeenCalledWith({
            Bucket: 'anotherBucket',
            Key: 'catalog/somebighash123456.json'
        })

        expect(mockResponseObject.status).toHaveBeenCalledWith(200)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
    })

    test('rejects requests without apiKey or id fields', async () => {
        let req = generateRequestContext()

        await deleteAdminCatalogVisibility(req, mockResponseObject)

        expect(mockResponseObject.status).toHaveBeenCalledWith(400)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Invalid input' })
    })
})