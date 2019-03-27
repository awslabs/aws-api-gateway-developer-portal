const index = require('../index')
const MemoryStream = require('memorystream')
const promiser = require('../../setup-jest').promiser

describe('sanitizeFilePath', () => {
    test('removes all leading slashes from a filepath', () => {
        // if a filepath in an s3 static site starts with '/',
        // it infinitely redirects...
        expect(index.sanitizeFilePath('foo')).toEqual('foo')
        expect(index.sanitizeFilePath('/foo')).toEqual('foo')
        expect(index.sanitizeFilePath('/foo/bar')).toEqual('foo/bar')
        expect(index.sanitizeFilePath('///foo/bar')).toEqual('foo/bar')
    })
})

describe('determineContentType', () => {
    test('correctly chooses content type', () => {
        expect(index.determineContentType('foo/bar'))
            .toBe('application/octet-stream')
        expect(index.determineContentType('foo/bar.unknown'))
            .toBe('application/octet-stream')
        expect(index.determineContentType('foo/bar.html'))
            .toBe('text/html')
        expect(index.determineContentType('foo/bar.css'))
            .toBe('text/css')
        expect(index.determineContentType('foo/bar.js'))
            .toBe('application/javascript')
        expect(index.determineContentType('foo/bar.png'))
            .toBe('image/png')
        expect(index.determineContentType('foo/bar.jpeg'))
            .toBe('image/jpeg')
        // note that jpg is a valid file extension
        // but the contentType should be image/jpeg !
        expect(index.determineContentType('foo/bar.jpg'))
            .toBe('image/jpeg')

        expect(index.determineContentType('foo/.html/.css/confusing.js'))
            .toBe('application/javascript')
        expect(index.determineContentType('foo/.html/.css/confusing'))
            .toBe('application/octet-stream')
    })
})

describe('cleanS3Bucket', () => {
    test('should delete all the contents of a bucket', async () => {
        let expectedDeleteObjectsRequest = {
            Bucket: 'bucketName',
            Delete: {
                Objects: [{Key: 'static/asset.js'}, {Key: 'README'}]
            }
        }

        index.s3.listObjectsV2 = jest.fn().mockReturnValue(promiser({
            Contents: [
                { Key: 'static/asset.js' },
                { Key: 'README' }
            ]
        }))

        index.s3.deleteObjects = jest.fn().mockReturnValue(promiser())

        await index.cleanS3Bucket('bucketName')

        expect(index.s3.listObjectsV2)
            .toHaveBeenNthCalledWith(1, {Bucket: 'bucketName'})
        expect(index.s3.deleteObjects)
            .toHaveBeenNthCalledWith(1, expectedDeleteObjectsRequest)
    })

    test('should safely handle attempting to delete an empty bucket', async () => {
        index.s3.listObjectsV2 =
            jest.fn().mockReturnValue(promiser({ Contents: [] }))

        index.s3.deleteObjects = jest.fn()

        let promise = index.cleanS3Bucket('bucketName')

        await promise

        expect(promise).toEqual(expect.any(Promise))
        expect(index.s3.listObjectsV2).toHaveBeenNthCalledWith(1, {Bucket: 'bucketName'})
        expect(index.s3.deleteObjects).not.toHaveBeenCalled()
    })
})

describe('createCatalogDirectory', () => {
    test('should create the catalog directory', async () => {
        let expectedInputs = {
            Bucket: 'bucketName',
            Key: 'catalog/',
            // empty body makes it a "directory" to most S3 clients
            // e.g., the S3 console
            Body: ''
        }
        index.s3.upload = jest.fn().mockReturnValue(promiser('success!'))

        let promise = index.createCatalogDirectory('bucketName')

        await promise

        expect(promise).resolves.toEqual('success!')
        expect(index.s3.upload).toHaveBeenNthCalledWith(1, expectedInputs)
    })
})

describe('generalizeFilePath', () => {
    test('should generate a relative path', () => {
        // path should start at (and exclude) the first occurrence of /build/
        expect(index.generalizeFilePath('/var/task/build/sdks/js.zip')).toEqual('sdks/js.zip')
        expect(index.generalizeFilePath('/var/task/build/dev-portal/build/index.html')).toEqual('dev-portal/build/index.html')
    })
})

describe('notifyCFNThatUploadSucceeded', () => {
    test('should notify cloudformation that the action succeeded', () => {
        let responseData = {}, event = {}, context = {},
            response = require('../notify-cfn')

        response.ofSuccess = jest.fn()

        index.notifyCFNThatUploadSucceeded(responseData, event, context)

        expect(response.ofSuccess).toHaveBeenCalledWith({ event, context, responseData })
    })
})

describe('notifyCFNThatUploadFailed', () => {
    test('should notify cloudformation that the action failed', () => {
        let error = new Error(), event = { 'event': 'object' }, context = { 'context': 'object' },
            response = require('../notify-cfn')

        response.ofFailure = jest.fn()

        index.notifyCFNThatUploadFailed(error, event, context)

        expect(response.ofFailure).toHaveBeenCalledWith({ event, context, error })
    })
})

describe('handler', () => {
    test('should, on delete, delete the contents of the site assets bucket and the catalog bucket', async () => {
        let event = {
            ResourceProperties: {
                BucketName: 'bucketName'
            },
            RequestType: 'Delete'
        },
        context = {
            test: 'context'
        }

        process.env.StaticBucketName = 'staticBucketName'
        index.cleanS3Bucket =
            jest.fn().mockResolvedValue(null)
        index.notifyCFNThatUploadSucceeded = jest.fn()

        await index.handler(event, context)

        expect(index.cleanS3Bucket).toHaveBeenCalledWith('bucketName')
        expect(index.cleanS3Bucket).toHaveBeenCalledWith('staticBucketName')
        expect(index.notifyCFNThatUploadSucceeded).toHaveBeenCalledWith(expect.any(Object), event, context)

        delete process.env.StaticBucketName
    })

    test('should, on update or create, create a catalog directory and upsert sdkGeneration.json', async () => {
        let event = {
                ResourceProperties: {
                    BucketName: 'bucketName'
                },
                RequestType: 'Create'
            },
            context = {
                test: 'context'
            }

        process.env.StaticBucketName = 'staticBucketName'
        index.createCatalogDirectory = jest.fn().mockResolvedValue()
        index.uploadStaticAssets = jest.fn()
        index.s3.headObject = jest.fn().mockReturnValue(promiser({}))

        await index.handler(event, context)

        expect(index.createCatalogDirectory).toHaveBeenCalledWith('staticBucketName')
        expect(index.uploadStaticAssets).toHaveBeenCalledWith('bucketName', event, context)

        expect(index.s3.headObject).toHaveBeenCalledTimes(1)
        expect(index.s3.headObject).toHaveBeenCalledWith({
            Bucket: 'staticBucketName',
            Key: 'sdkGeneration.json'
        })

        delete process.env.StaticBucketName
    })

    test('should notify CFN of failure if bucket name is not defined in the event', async () => {
        let event = { ResourceProperties: {} }, context = {}

        index.notifyCFNThatUploadFailed = jest.fn()

        await index.handler(event, context)

        expect(index.notifyCFNThatUploadFailed).toHaveBeenCalledTimes(1)
        expect(index.notifyCFNThatUploadFailed).toHaveBeenCalledWith(expect.any(String), event, context)
    })
})

describe('excludeDirFactory', () => {
    test('returns a stream filter that excludes directories', () => {
        let fileObj = { stats: { isDirectory: () => false } },
            dirObj = { stats: { isDirectory: () => true } },
            stream = new MemoryStream(null, { objectMode: true, readable: true, writable: true }),
            dirFilter = index.excludeDirFactory(),
            results = []

        stream.write(fileObj)
        stream.write(dirObj)

        stream
            .pipe(dirFilter)
            .on('data', (data) => {
                results.push(data)
            })
            .on('end', (res) => {
                expect(results.length).toBe(1)
                expect(results[0]).toEqual(fileObj)
            })

        stream.end()
    })
})

describe('excludeCustomContentFactory', () => {
    function doStreamTest(inputs, filter) {
        return new Promise((resolve) => {
            let stream = new MemoryStream(null, { objectMode: true, readable: true, writable: true }),
                results = []

            for (let input of inputs) {
                stream.write(input)
            }

            stream
                .pipe(filter)
                .on('data', (data) => {
                    results.push(data)
                })
                .on('end', () => {
                    resolve(results)
                })
            stream.end()
        })

    }

    test('on update, filters stream to remove custom content', async () => {
        let removed = { path: 'foo/bar/build/custom-content/junk' },
            kept = { path: 'some/other/file/path' },
            customFilter = index.excludeCustomContentFactory("Update", undefined),
            results = await doStreamTest([removed, kept], customFilter)

        expect(results.length).toBe(1)
        expect(results[0]).toEqual(kept)
    })

    test('on create, allows all stream objects to pass through', async () => {
        let first = { path: 'foo/bar/build/custom-content/junk' },
            second = { path: 'some/other/file/path' },
            customFilter = index.excludeCustomContentFactory('Create', undefined),
            results = await doStreamTest([first, second], customFilter)

        expect(results.length).toBe(2)
        expect(results[0]).toEqual(first)
        expect(results[1]).toEqual(second)
    })

    test('when RebuildMode is set to true, allows all stream objects to pass through', async () => {
        let first = { path: 'foo/bar/build/custom-content/junk' },
            second = { path: 'some/other/file/path' },
            customFilter = index.excludeCustomContentFactory('Update', 'overwrite-content'),
            results = await doStreamTest([first, second], customFilter)

        expect(results.length).toBe(2)
        expect(results[0]).toEqual(first)
        expect(results[1]).toEqual(second)
    })
})