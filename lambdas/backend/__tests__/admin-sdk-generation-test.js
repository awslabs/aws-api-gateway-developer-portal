const putAdminCatalogSdkGeneration = require('../express-route-handlers').putAdminCatalogSdkGeneration
const deleteAdminCatalogSdkGeneration = require('../express-route-handlers').deleteAdminCatalogSdkGeneration
const handlers = require('../express-route-handlers')
const s3 = require('../express-route-handlers').s3
const lambda = require('../express-route-handlers').lambda
const promiser = require('../../setup-jest').promiser
const generateResponseContext = require('../../setup-jest').generateResponseContext
const generateRequestContext = require('../../setup-jest').generateRequestContext

describe('putAdminCatalogSdkGeneration', () => {
    test('it should call idempotentSdkGenerationUpdate', async () => {
        let req = generateRequestContext()
        req.params = { id: 'apiid_stagename' }

        let mockedIdempotentSdkGenerationUpdate =
            jest.spyOn(handlers, 'idempotentSdkGenerationUpdate')
                .mockImplementation(() => {})

        await handlers.putAdminCatalogSdkGeneration(req, {})

        expect(handlers.idempotentSdkGenerationUpdate).toHaveBeenCalledTimes(1)
        expect(handlers.idempotentSdkGenerationUpdate).toHaveBeenCalledWith(true, 'apiid_stagename', {})

        mockedIdempotentSdkGenerationUpdate.mockReset()
        mockedIdempotentSdkGenerationUpdate.mockRestore()
    })
})

describe('deleteAdminCatalogSdkGeneration', () => {
    test('it should call idempotentSdkGenerationUpdate', async () => {
        let req = generateRequestContext()
        req.params = {id: 'apiid_stagename'}

        let mockedIdempotentSdkGenerationUpdate =
            jest.spyOn(handlers, 'idempotentSdkGenerationUpdate')
                .mockImplementation(() => {})

        await handlers.deleteAdminCatalogSdkGeneration(req, {})

        expect(handlers.idempotentSdkGenerationUpdate).toHaveBeenCalledTimes(1)
        expect(handlers.idempotentSdkGenerationUpdate).toHaveBeenCalledWith(false, 'apiid_stagename', {})

        mockedIdempotentSdkGenerationUpdate.mockReset()
        mockedIdempotentSdkGenerationUpdate.mockRestore()
    })
})

describe('idempotentSdkGenerationUpdate', () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    test('it should update sdkGeneration.json', async () => {
        let res = generateResponseContext(),
            body = JSON.stringify({
                'apiid_stagename': false,
                'otherapiid_otherstagename': false
            })

        s3.getObject = jest.fn().mockReturnValue(promiser({
            Body: body
        }))
        s3.upload = jest.fn().mockReturnValue(promiser())
        lambda.invoke = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'staticBucketName'
        process.env.CatalogUpdaterFunctionArn = 'somebigfunctionarn'


        await handlers.idempotentSdkGenerationUpdate(true, 'apiid_stagename', res)

        expect(s3.getObject).toHaveBeenCalledTimes(1)
        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'staticBucketName',
            Key: 'sdkGeneration.json'
        })

        expect(s3.upload).toHaveBeenCalledTimes(1)
        expect(s3.upload).toHaveBeenCalledWith({
            Bucket: 'staticBucketName',
            Key: 'sdkGeneration.json',
            Body: JSON.stringify({
                'apiid_stagename': true,
                'otherapiid_otherstagename': false
            })
        })

        expect(lambda.invoke).toHaveBeenCalledTimes(1)
        expect(lambda.invoke).toHaveBeenCalledWith({
            FunctionName: 'somebigfunctionarn',
            InvocationType: 'RequestResponse',
            LogType: 'None'
        })

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.status().json).toHaveBeenCalledWith({ message: 'Success' })
    })

    test('it should update sdkGeneration.json even when the api is not yet in the file', async () => {
        let res = generateResponseContext(),
        body = JSON.stringify({
            'otherapiid_otherstagename': false
        })

        s3.getObject = jest.fn().mockReturnValue(promiser({
            Body: body
        }))
        s3.upload = jest.fn().mockReturnValue(promiser())
        lambda.invoke = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'staticBucketName'
        process.env.CatalogUpdaterFunctionArn = 'somebigfunctionarn'

        await handlers.idempotentSdkGenerationUpdate(true, 'apiid_stagename', res)

        expect(s3.getObject).toHaveBeenCalledTimes(1)
        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'staticBucketName',
            Key: 'sdkGeneration.json'
        })

        expect(s3.upload).toHaveBeenCalledTimes(1)
        expect(s3.upload).toHaveBeenCalledWith({
            Bucket: 'staticBucketName',
            Key: 'sdkGeneration.json',
            Body: JSON.stringify({
                'otherapiid_otherstagename': false,
                'apiid_stagename': true
            })
        })

        expect(lambda.invoke).toHaveBeenCalledTimes(1)
        expect(lambda.invoke).toHaveBeenCalledWith({
            FunctionName: 'somebigfunctionarn',
            InvocationType: 'RequestResponse',
            LogType: 'None'
        })

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.status().json).toHaveBeenCalledWith({ message: 'Success' })
    })

    test('it should not update sdkGeneration.json when it\'s unnecessary', async () => {
        let res = generateResponseContext(),
        body = JSON.stringify({
            'apiid_stagename': false,
            'otherapiid_otherstagename': false
        })

        s3.getObject = jest.fn().mockReturnValue(promiser({
            Body: body
        }))
        s3.upload = jest.fn().mockReturnValue(promiser())
        lambda.invoke = jest.fn().mockReturnValue(promiser())

        process.env.StaticBucketName = 'staticBucketName'
        process.env.CatalogUpdaterFunctionArn = 'somebigfunctionarn'

        await handlers.idempotentSdkGenerationUpdate(false, 'apiid_stagename', res)

        expect(s3.getObject).toHaveBeenCalledTimes(1)
        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'staticBucketName',
            Key: 'sdkGeneration.json'
        })

        expect(s3.upload).toHaveBeenCalledTimes(0)
        expect(lambda.invoke).toHaveBeenCalledTimes(0)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.status().json).toHaveBeenCalledWith({ message: 'Success' })
    })
})