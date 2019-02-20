const getAdminCatalogVisibility = require('../express-route-handlers').getAdminCatalogVisibility
const postAdminCatalogVisibility = require('../express-route-handlers').postAdminCatalogVisibility
const deleteAdminCatalogVisibility = require('../express-route-handlers').deleteAdminCatalogVisibility
const s3 = require('../express-route-handlers').s3
const apigateway = require('../express-route-handlers').apigateway
const promiser = require('../../setup-jest').promiser
const routeHandlers = require('../../setup-jest')
let catalog = require('../catalog/index')

const mockResponseObject = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
}

jest.mock('../catalog/index')

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
                    swagger: {}
                }
            ]
        }))

        apigateway.getRestApis = jest.fn().mockReturnValue(promiser({
            items: [
                {
                    id: 'a1b2c3'
                },
                {
                    id: 'd1e2f3'
                },
                {
                    id: 'g1h1i1'
                },
                {
                    id: 'j1k2l3'
                }
            ]
        }))

        apigateway.getStages = jest.fn()
            .mockReturnValueOnce(promiser({
                item: [
                    {
                        stageName: 'gamma'
                    },
                    {
                        stageName: 'prod'
                    },
                    {
                        stageName: 'exclude'
                    }
                ]
            }))
            .mockReturnValueOnce(promiser({
                item: [
                    {
                        stageName: 'def'
                    }
                ]
            }))
            .mockReturnValueOnce(promiser({
                item: [
                    {
                        stageName: 'ghi'
                    }
                ]
            }))
            .mockReturnValue(promiser({
                item: [
                    {
                        stageName: 'exclude'
                    }
                ]
            }))

        // routeHandlers.catalog



        await getAdminCatalogVisibility({}, mockResponseObject)

        expect(apigateway.getRestApis).toHaveBeenCalledTimes(1)
        expect(apigateway.getStages).toHaveBeenCalledTimes(4)
        expect(mockResponseObject.status).toHaveBeenCalledWith(200)
        expect(mockResponseObject.json).toHaveBeenCalledWith({
            apiGateway: [
                {
                    id: "a1b2c3",
                    stage: "gamma",
                    visibility: true
                },
                {
                    id: "a1b2c3",
                    stage: "prod",
                    visibility: true
                },
                {
                    id: "a1b2c3",
                    stage: "exclude",
                    visibility: false
                },
                {
                    id: "d1e2f3",
                    stage: "def",
                    visibility: true
                },
                {
                    id: "g1h1i1",
                    stage: "ghi",
                    visibility: false
                },
                {
                    id: "j1k2l3",
                    stage: "exclude",
                    visibility: false
                }
            ],
            generic: {
                1234567890: {
                    visibility: true
                }
            }
        })
    })
})

describe('postAdminCatalogVisibility', () => {
    test('exports and uploads swagger doc for api gateway managed apis', async () => {
        let req = { body: { apiKey: 'a1b2c3_prod' } }

        apigateway.getExport = jest.fn().mockReturnValue(promiser({
                message: 'swagger document'
        }))

        s3.upload = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'myBucket'

        await postAdminCatalogVisibility(req, mockResponseObject)

        expect(apigateway.getExport).toHaveBeenCalledWith({
            restApiId: 'a1b2c3',
            stageName: 'prod',
            exportType: 'swagger',
            extensions: 'apigateway'
        })

        expect(s3.upload).toHaveBeenCalledWith({
            Bucket: 'myBucket',
            Key: 'catalog/',
            Body: JSON.stringify({ message: 'swagger document' })
        })

        expect(mockResponseObject.status).toHaveBeenCalledWith(200)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
    })

    test('uploads swagger doc for generic apis', async () => {
        let req = { body: { swagger: { message: 'swagger document' } } }

        s3.upload = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'myPail'

        await postAdminCatalogVisibility(req, mockResponseObject)

        expect(s3.upload).toHaveBeenCalledWith({
            Bucket: 'myPail',
            Key: 'catalog/',
            Body: JSON.stringify({ message: 'swagger document' })
        })

        expect(mockResponseObject.status).toHaveBeenCalledWith(200)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
    })

    test('rejects requests without apiKey or swagger fields', async () => {
        let req = {}

        await postAdminCatalogVisibility(req, mockResponseObject)

        expect(mockResponseObject.status).toHaveBeenCalledWith(400)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Invalid input' })
    })
})

describe('deleteAdminCatalogVisibility', () => {
    test('deletes swagger doc from s3 for api gateway managed apis', async () => {
        let req = { body: { apiKey: 'a1b2c3_prod' } }

        s3.delete = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'myOtherBucket'

        await deleteAdminCatalogVisibility(req, mockResponseObject)

        expect(s3.delete).toHaveBeenCalledWith({
            Bucket: 'myOtherBucket',
            Key: 'catalog/a1b2c3_prod.json'
        })

        expect(mockResponseObject.status).toHaveBeenCalledWith(200)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
    })

    test('deletes swagger doc from s3 for generic apis', async () => {
        let req = { body: { id: 'somebighash123456' } }

        s3.delete = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'myOtherBucket'

        await deleteAdminCatalogVisibility(req, mockResponseObject)

        expect(s3.delete).toHaveBeenCalledWith({
            Bucket: 'myOtherBucket',
            Key: 'catalog/somebighash123456.json'
        })

        expect(mockResponseObject.status).toHaveBeenCalledWith(200)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Success' })
    })

    test('rejects requests without apiKey or id fields', async () => {
        let req = {}

        await deleteAdminCatalogVisibility(req, mockResponseObject)

        expect(mockResponseObject.status).toHaveBeenCalledWith(400)
        expect(mockResponseObject.json).toHaveBeenCalledWith({ message: 'Invalid input' })
    })
})