const index = require('../index')
const { promiser, bindEnv } = require('../../setup-jest')

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
  const setEnv = bindEnv()

  test('should delete all the contents of a bucket', async () => {
    const expectedDeleteObjectsRequest = {
      Bucket: 'bucketName',
      Delete: {
        Objects: [{ Key: 'static/asset.js' }, { Key: 'README' }]
      },
      ExpectedBucketOwner: '123412341234'
    }

    setEnv('SourceAccount', '123412341234')

    index.s3.listObjectsV2 = jest.fn().mockReturnValue(promiser({
      Contents: [
        { Key: 'static/asset.js' },
        { Key: 'README' }
      ]
    }))

    index.s3.deleteObjects = jest.fn().mockReturnValue(promiser())

    await index.cleanS3Bucket('bucketName')

    expect(index.s3.listObjectsV2)
      .toHaveBeenNthCalledWith(1, { Bucket: 'bucketName', ExpectedBucketOwner: '123412341234' })
    expect(index.s3.deleteObjects)
      .toHaveBeenNthCalledWith(1, expectedDeleteObjectsRequest)
  })

  test('should safely handle attempting to delete an empty bucket', async () => {
    setEnv('SourceAccount', '123412341234')

    index.s3.listObjectsV2 =
            jest.fn().mockReturnValue(promiser({ Contents: [] }))

    index.s3.deleteObjects = jest.fn()

    const promise = index.cleanS3Bucket('bucketName')

    await promise

    expect(promise).toEqual(expect.any(Promise))
    expect(index.s3.listObjectsV2).toHaveBeenNthCalledWith(1, { Bucket: 'bucketName', ExpectedBucketOwner: '123412341234' })
    expect(index.s3.deleteObjects).not.toHaveBeenCalled()
  })
})

describe('createCatalogDirectory', () => {
  const setEnv = bindEnv()

  test('should create the catalog directory', async () => {
    setEnv('SourceAccount', '123412341234')

    const expectedInputs = {
      Bucket: 'bucketName',
      Key: 'catalog/',
      // empty body makes it a "directory" to most S3 clients
      // e.g., the S3 console
      Body: '',
      ExpectedBucketOwner: '123412341234'
    }
    index.s3.upload = jest.fn().mockReturnValue(promiser('success!'))

    await index.createCatalogDirectory('bucketName')

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
    const responseData = {}; const event = {}; const context = {}
    const response = require('dev-portal-common/notify-cfn')

    response.ofSuccess = jest.fn()

    new index.State(event, context).notifyCFNThatUploadSucceeded(responseData)

    expect(response.ofSuccess).toHaveBeenCalledWith({ event, context, responseData })
  })
})

describe('notifyCFNThatUploadFailed', () => {
  test('should notify cloudformation that the action failed', () => {
    const error = new Error(); const event = { event: 'object' }; const context = { context: 'object' }
    const response = require('dev-portal-common/notify-cfn')

    response.ofFailure = jest.fn()

    new index.State(event, context).notifyCFNThatUploadFailed(error)

    expect(response.ofFailure).toHaveBeenCalledWith({ event, context, error })
  })
})

describe('handler', () => {
  const setEnv = bindEnv()

  test('should, on delete, delete the contents of the site assets bucket and the catalog bucket', async () => {
    const event = {
      ResourceProperties: {
        BucketName: 'bucketName'
      },
      RequestType: 'Delete'
    }
    const context = {
      test: 'context'
    }
    const state = new index.State(event, context)

    process.env.StaticBucketName = 'staticBucketName'
    index.cleanS3Bucket = jest.fn().mockResolvedValue(null)
    state.notifyCFNThatUploadSucceeded = jest.fn()

    await state.handler()

    expect(index.cleanS3Bucket).toHaveBeenCalledTimes(2)
    expect(index.cleanS3Bucket).toHaveBeenCalledWith('bucketName')
    expect(index.cleanS3Bucket).toHaveBeenCalledWith('staticBucketName')
    expect(state.notifyCFNThatUploadSucceeded).toHaveBeenCalledWith(expect.any(Object))

    delete process.env.StaticBucketName
  })

  test('should, on update or create, create a catalog directory and upsert sdkGeneration.json', async () => {
    const event = {
      ResourceProperties: {
        BucketName: 'bucketName'
      },
      RequestType: 'Create'
    }
    const context = {
      test: 'context'
    }
    const state = new index.State(event, context)
    setEnv('SourceAccount', '123412341234')
    setEnv('StaticBucketName', 'staticBucketName')

    index.createCatalogDirectory = jest.fn().mockResolvedValue()
    state.uploadStaticAssets = jest.fn()
    index.s3.headObject = jest.fn().mockReturnValue(promiser({}))

    await state.handler()

    expect(index.createCatalogDirectory).toHaveBeenCalledWith('staticBucketName')
    expect(state.uploadStaticAssets).toHaveBeenCalledWith('bucketName')

    expect(index.s3.headObject).toHaveBeenCalledTimes(1)
    expect(index.s3.headObject).toHaveBeenCalledWith({
      Bucket: 'staticBucketName',
      Key: 'sdkGeneration.json',
      ExpectedBucketOwner: '123412341234'
    })
  })

  test('should notify CFN of failure if bucket name is not defined in the event', async () => {
    const event = { ResourceProperties: {} }; const context = {}
    const state = new index.State(event, context)

    state.notifyCFNThatUploadFailed = jest.fn()

    await state.handler()

    expect(state.notifyCFNThatUploadFailed).toHaveBeenCalledTimes(1)
    expect(state.notifyCFNThatUploadFailed).toHaveBeenCalledWith(expect.any(String))
  })
})
