const fs = require('fs'),
    path = require('path'),
    index = require('../index'),
    promiser = require('../../setup-jest').promiser

describe('swaggerFileFilter', () => {
    test('should only process JSON or YAML files in the catalog directory', () => {
        // not in catalog/ directory, should all fail
        expect(index.swaggerFileFilter({Key: 'swagger.json'})).toBe(false)
        expect(index.swaggerFileFilter({Key: 'swagger.yaml'})).toBe(false)
        expect(index.swaggerFileFilter({Key: 'swagger.yml'})).toBe(false)
        expect(index.swaggerFileFilter({Key: 'swagger.json'})).toBe(false)
        expect(index.swaggerFileFilter({Key: 'not-swagger'})).toBe(false)
        expect(index.swaggerFileFilter({Key: 'not-swagger.json.misleading'})).toBe(false)

        // in catalog/ directory, only the swagger json/yaml/yml should pass
        expect(index.swaggerFileFilter({Key: 'catalog/swagger.json'})).toBe(true)
        expect(index.swaggerFileFilter({Key: 'catalog/swagger.yaml'})).toBe(true)
        expect(index.swaggerFileFilter({Key: 'catalog/swagger.yml'})).toBe(true)
        expect(index.swaggerFileFilter({Key: 'catalog/swagger.json/nested-swagger-counts-too.json'})).toBe(true)
        expect(index.swaggerFileFilter({Key: 'catalog/not-swagger.json/fakeout'})).toBe(false)
        expect(index.swaggerFileFilter({Key: 'catalog/not-swagger'})).toBe(false)
        expect(index.swaggerFileFilter({Key: 'catalog/not-swagger.json.misleading'})).toBe(false)
    });
})

describe('getSwaggerFile', () => {

    afterEach(() => {
        index.s3.getObject = jest.fn(() => { throw new Error('getObject called before init') })
    })

    test('should recognize generic swagger files after fetching them from S3', async () => {
        // generic swagger is swagger not managed by api gateway; we detect this based on it not having any
        // x-amazon-apigateway-integration fields in the path

        let fileBody = fs.readFileSync(path.join(__dirname, '/generic-swagger.json')),
            internalRepr

        index.s3.getObject = jest.fn().mockReturnValueOnce(promiser({ Body: fileBody }))

        internalRepr = await index.getSwaggerFile({ Key: 'catalog/swagger.json' })

        expect(internalRepr.id).toBe(index.hash(JSON.parse(fileBody.toString())))
        expect(internalRepr.apiStageKey).toBeUndefined()
        expect(internalRepr.generic).toBe(true)
        expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
    })

    test('should recognize swagger files saved in apiId_stageName format after fetching them from S3', async () => {
        // the admin panel uploads files in this format; we then read them and build them into the catalog
        let fileBody = fs.readFileSync(path.join(__dirname, '/api-gateway-swagger.json')),
            internalRepr

        index.s3.getObject = jest.fn().mockReturnValueOnce(promiser({ Body: fileBody }))

        internalRepr = await index.getSwaggerFile({ Key: 'catalog/a1b2c3d4e5_stagename.json' })

        expect(internalRepr.id).toBeUndefined()
        expect(internalRepr.apiStageKey).toBe('a1b2c3d4e5_stagename')
        expect(internalRepr.generic).toBeUndefined()
        expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
    })

    test('should not recognize exported swagger files after fetching them from S3', async () => {
        // we used to automatically detect exported swagger files by reading into their host and basePath fields
        // we no longer do this, and this test serves to confirm that we do not automatically detect if a swagger file
        // was exported from API GW. this makes cross-account generic APIs easier, and prevents the admin panel's
        // "make visible" from accidentally promoting exported-but-intended-to-be-generic swagger files into apiGateway
        // managed files

        let fileBody = fs.readFileSync(path.join(__dirname, '/api-gateway-swagger.json')),
            internalRepr

        index.s3.getObject = jest.fn().mockReturnValueOnce(promiser({ Body: fileBody }))

        internalRepr = await index.getSwaggerFile({ Key: 'catalog/normal-exported-swagger.json' })

        expect(internalRepr.id).toBe(index.hash(JSON.parse(fileBody.toString())))
        expect(internalRepr.apiStageKey).toBeUndefined()
        expect(internalRepr.generic).toBe(true)
        expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
    })

    test('should recognize generic OAS3 files after fetching them from S3', async () => {
        // generic swagger is OAS3 not managed by api gateway; we detect this based on it not having any
        // x-amazon-apigateway-integration fields in the path

        let fileBody = fs.readFileSync(path.join(__dirname, '/generic-oas3.json')),
            internalRepr

        index.s3.getObject = jest.fn().mockReturnValueOnce(promiser({ Body: fileBody }))

        internalRepr = await index.getSwaggerFile({ Key: 'catalog/swagger.json' })

        expect(internalRepr.id).toBe(index.hash(JSON.parse(fileBody.toString())))
        expect(internalRepr.apiStageKey).toBeUndefined()
        expect(internalRepr.generic).toBe(true)
        expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
    })

    test('should recognize OAS3 files saved in apiId_stageName format after fetching them from S3', async () => {
        // the admin panel uploads files in this format; we then read them and build them into the catalog
        let fileBody = fs.readFileSync(path.join(__dirname, '/api-gateway-oas3.json')),
            internalRepr

        index.s3.getObject = jest.fn().mockReturnValueOnce(promiser({ Body: fileBody }))

        internalRepr = await index.getSwaggerFile({ Key: 'catalog/a1b2c3d4e5_oasstagename.json' })

        expect(internalRepr.id).toBeUndefined()
        expect(internalRepr.apiStageKey).toBe('a1b2c3d4e5_oasstagename')
        expect(internalRepr.generic).toBeUndefined()
        expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
    })

    test('should not recognize exported OAS3 files after fetching them from S3', async () => {
        // we used to automatically detect exported swagger files by reading into their host and basePath fields
        // we no longer do this, and this test serves to confirm that we do not automatically detect if a swagger file
        // was exported from API GW. this makes cross-account generic APIs easier, and prevents the admin panel's
        // "make visible" from accidentally promoting exported-but-intended-to-be-generic swagger files into apiGateway
        // managed files

        let fileBody = fs.readFileSync(path.join(__dirname, '/api-gateway-oas3.json')),
            internalRepr

        index.s3.getObject = jest.fn().mockReturnValueOnce(promiser({ Body: fileBody }))

        internalRepr = await index.getSwaggerFile({ Key: 'catalog/normal-exported-oas3.json' })

        expect(internalRepr.id).toBe(index.hash(JSON.parse(fileBody.toString())))
        expect(internalRepr.apiStageKey).toBeUndefined()
        expect(internalRepr.generic).toBe(true)
        expect(internalRepr.body).toEqual(JSON.parse(fileBody.toString()))
    })
})

describe('buildCatalog', () => {
    test('should generate a correct catalog object from api gateway\'s usage plan', async () => {
        let usagePlan = {
                id: 'a1b2c3',
                name: 'Basic',
                throttle: {'rateLimit': 100.0, 'burstLimit': 10},
                quota: {'limit': 5, 'period': 'MONTH', 'offset': 0},
                apiStages: [{'apiId': 'a1b2c3d4e5', 'stage': 'prod'}]
            },
            swaggerFileReprs = [
                { body: 'prodSwaggerBody', apiStageKey: 'a1b2c3d4e5_prod' },
                { body: 'gammaSwaggerBody', apiStageKey: 'a1b2c3d4e5_gamma' },
                { body: 'genericSwaggerBody', generic: true, id: 'somehugehash' },
            ],
            expectedCatalog = {
                apiGateway: [{
                    id: 'a1b2c3',
                    name: 'Basic',
                    throttle: {rateLimit: 100, burstLimit: 10},
                    quota: {limit: 5, period: 'MONTH', offset: 0},
                    apis: [{
                        swagger: 'prodSwaggerBody',
                        id: 'a1b2c3d4e5',
                        stage: 'prod',
                        sdkGeneration: false
                    }]
                }],
                generic: [{
                    swagger: 'genericSwaggerBody',
                    id: 'somehugehash',
                    generic: true,
                    sdkGeneration: false
                }]
            }

        index.gateway.getUsagePlans = jest.fn().mockReturnValueOnce(promiser({ items: [usagePlan] }))

        expect(await index.buildCatalog(swaggerFileReprs, {})).toEqual(expectedCatalog)
    })
})

describe('usagePlanToCatalogObject', () => {

    let firstValidApi = { swagger: 'prodSwaggerBody', id: 'a1b2c3d4e5', stage: 'prod', sdkGeneration: false }
    let secondValidApi = { swagger: 'gammaSwaggerBody', id: 'a1b2c3d4e5', stage: 'gamma', sdkGeneration: false }

    let usagePlan = {
        id: 'MYID',
        name: 'My Usage Plan',
        throttle: 1000,
        quota: 100000,
        apiStages: [ 
            { apiId: 'a1b2c3d4e5', stage: 'prod' },
            { apiId: 'a1b2c3d4e5', stage: 'gamma' }
        ]
    }

    test('correctly builds catalog', async () => {
        const swaggerFileReprs = [
            { body: 'prodSwaggerBody', apiStageKey: 'a1b2c3d4e5_prod' }, // included in usage plans
            { body: 'gammaSwaggerBody', apiStageKey: 'a1b2c3d4e5_gamma' }, // included in usage plans
            { body: 'otherSwaggerBody', apiStageKey: 'jf8f40f83f5_test' }, // NOT included in usage plans
            { body: 'genericSwaggerBody', generic: true, id: 'somehugehash' } // NOT included in usage plans (generic)
        ]

        const catalogObject = index.usagePlanToCatalogObject(usagePlan, swaggerFileReprs, {})

        expect(catalogObject.apis.length).toEqual(2)
        expect(catalogObject.apis[0]).toEqual(firstValidApi)
        expect(catalogObject.apis[1]).toEqual(secondValidApi)
    })
    
    test('correctly handles only generic swaggerFileReprs', async () => {
        const swaggerFileReprs = [
            { body: 'genericSwaggerBody', generic: true, id: 'somehugehash' } // NOT included in usage plans (generic)
        ]

        const catalogObject = index.usagePlanToCatalogObject(usagePlan, swaggerFileReprs, {})

        expect(catalogObject.apis.length).toEqual(0)
    })

    test('correctly handles empty swaggerFileReprs', async () => {
        const swaggerFileReprs = []

        const catalogObject = index.usagePlanToCatalogObject(usagePlan, swaggerFileReprs, {})

        expect(catalogObject.apis.length).toEqual(0)
    })
})

describe('copyAnyMethod', () => {
    test('correctly copies ANY methods to other methods in swagger documents', async () => {
        const fileBody = JSON.parse(fs.readFileSync(path.join(__dirname, '/swagger-ANY-method.json'), 'utf8'))
        const anyMethod = fileBody.paths["/"]["x-amazon-apigateway-any-method"]
        const catalogObject = index.copyAnyMethod(fileBody)

        expect(catalogObject.paths["/"]).toEqual({
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
        const getMethod = fileBody.paths["/"]["get"]
        const anyMethod = fileBody.paths["/"]["x-amazon-apigateway-any-method"]
        const catalogObject = index.copyAnyMethod(fileBody)

        expect(catalogObject.paths["/"]).toEqual({
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
        const anyMethod = fileBody.paths["/"]["x-amazon-apigateway-any-method"]
        const catalogObject = index.copyAnyMethod(fileBody)

        expect(catalogObject.paths["/"]).toEqual({
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
        const getMethod = fileBody.paths["/"]["get"]
        const anyMethod = fileBody.paths["/"]["x-amazon-apigateway-any-method"]
        const catalogObject = index.copyAnyMethod(fileBody)

        expect(catalogObject.paths["/"]).toEqual({
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

describe('handler', () => {
    afterEach(() => {
        delete process.env.BucketName;
    })

    test('should fetch from S3 and upload to S3 when run', async () => {
        // this is a very abstract test
        // we just want to verify that we hand data around correctly
        // so, string tokens used in place of actual data
        let mockEvent = {},
            expectedUploadParams = {
                Bucket: 'bucketName',
                Key: 'catalog.json',
                ContentType: 'application/json',
                Body: '"catalog"'
            }

        process.env.BucketName = 'bucketName'

        // this is the contents of the file sdkGeneration.json in S3
        index.s3.getObject =
            jest.fn().mockReturnValue(promiser({ Body: Buffer.from('{ "apiid_stagename": true }') }))
        // these are all the files in the catalog/ directory of the S3 bucket
        index.s3.listObjectsV2 =
            jest.fn(() => true).mockReturnValue(promiser({ Contents: ['listedObjects'] }))
        index.swaggerFileFilter =
            jest.fn().mockReturnValue(true)
        index.getSwaggerFile =
            jest.fn().mockReturnValue('swagger')
        index.buildCatalog =
            jest.fn().mockReturnValue('catalog')
        index.s3.upload =
            jest.fn(() => true).mockReturnValue(promiser('uploaded'))

        await index.handler(mockEvent, {})

        expect(index.s3.getObject).toBeCalledTimes(1)
        expect(index.s3.getObject).toBeCalledWith({ Bucket: 'bucketName', Key: 'sdkGeneration.json' })
        expect(index.s3.listObjectsV2).toBeCalledTimes(1)
        expect(index.s3.listObjectsV2).toBeCalledWith({ Bucket: 'bucketName' })
        expect(index.swaggerFileFilter).toBeCalledTimes(1)
        expect(index.swaggerFileFilter).toBeCalledWith('listedObjects', expect.anything(), expect.anything())
        expect(index.getSwaggerFile).toBeCalledTimes(1)
        expect(index.getSwaggerFile).toBeCalledWith('listedObjects', expect.anything(), expect.anything())
        expect(index.buildCatalog).toBeCalledTimes(1)
        expect(index.buildCatalog).toBeCalledWith(['swagger'], { 'apiid_stagename': true })
        expect(index.s3.upload).toBeCalledTimes(1)
        expect(index.s3.upload).toBeCalledWith(expectedUploadParams)
    })
})