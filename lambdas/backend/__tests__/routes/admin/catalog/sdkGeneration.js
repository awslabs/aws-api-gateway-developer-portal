const util = require('../../../../util')
const { promiser, generateEvent } = require('../../../../../setup-jest')

const sdkGeneration = require('../../../../routes/admin/catalog/sdkGeneration')
const originalIdempotentSdkGenerationUpdate = sdkGeneration.idempotentSdkGenerationUpdate

describe('PUT /admin/catalog/:id/sdkGeneration', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    sdkGeneration.idempotentSdkGenerationUpdate = jest.fn()
  })

  afterEach(() => {
    sdkGeneration.idempotentSdkGenerationUpdate = originalIdempotentSdkGenerationUpdate
  })

  test('it should call idempotentSdkGenerationUpdate', async () => {
    await sdkGeneration.put(generateEvent(), 'apiid_stagename')

    expect(sdkGeneration.idempotentSdkGenerationUpdate).toHaveBeenCalledTimes(1)
    expect(sdkGeneration.idempotentSdkGenerationUpdate).toHaveBeenCalledWith(true, 'apiid_stagename')
  })
})

describe('DELETE /admin/catalog/:id/sdkGeneration', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    sdkGeneration.idempotentSdkGenerationUpdate = jest.fn()
  })

  test('it should call idempotentSdkGenerationUpdate', async () => {
    await sdkGeneration.delete(generateEvent(), 'apiid_stagename')

    expect(sdkGeneration.idempotentSdkGenerationUpdate).toHaveBeenCalledTimes(1)
    expect(sdkGeneration.idempotentSdkGenerationUpdate).toHaveBeenCalledWith(false, 'apiid_stagename')
  })

  afterEach(() => {
    sdkGeneration.idempotentSdkGenerationUpdate = originalIdempotentSdkGenerationUpdate
  })
})

describe('idempotentSdkGenerationUpdate', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    sdkGeneration.idempotentSdkGenerationUpdate = originalIdempotentSdkGenerationUpdate
  })

  test('it should update sdkGeneration.json', async () => {
    const body = JSON.stringify({
      apiid_stagename: false,
      otherapiid_otherstagename: false
    })

    util.s3.getObject = jest.fn().mockReturnValue(promiser({
      Body: body
    }))
    util.s3.upload = jest.fn().mockReturnValue(promiser())
    util.lambda.invoke = jest.fn().mockReturnValue(promiser())

    process.env.StaticBucketName = 'staticBucketName'
    process.env.CatalogUpdaterFunctionArn = 'somebigfunctionarn'

    const result = await sdkGeneration.idempotentSdkGenerationUpdate(true, 'apiid_stagename')

    expect(util.s3.getObject).toHaveBeenCalledTimes(1)
    expect(util.s3.getObject).toHaveBeenCalledWith({
      Bucket: 'staticBucketName',
      Key: 'sdkGeneration.json'
    })

    expect(util.s3.upload).toHaveBeenCalledTimes(1)
    expect(util.s3.upload).toHaveBeenCalledWith({
      Bucket: 'staticBucketName',
      Key: 'sdkGeneration.json',
      Body: JSON.stringify({
        apiid_stagename: true,
        otherapiid_otherstagename: false
      })
    })

    expect(util.lambda.invoke).toHaveBeenCalledTimes(1)
    expect(util.lambda.invoke).toHaveBeenCalledWith({
      FunctionName: 'somebigfunctionarn',
      InvocationType: 'RequestResponse',
      LogType: 'None'
    })

    expect(result).toEqual({ message: 'Success' })
  })

  test('it should update sdkGeneration.json even when the api is not yet in the file', async () => {
    const body = JSON.stringify({
      otherapiid_otherstagename: false
    })

    util.s3.getObject = jest.fn().mockReturnValue(promiser({
      Body: body
    }))
    util.s3.upload = jest.fn().mockReturnValue(promiser())
    util.lambda.invoke = jest.fn().mockReturnValue(promiser())

    process.env.StaticBucketName = 'staticBucketName'
    process.env.CatalogUpdaterFunctionArn = 'somebigfunctionarn'

    const result = await sdkGeneration.idempotentSdkGenerationUpdate(true, 'apiid_stagename')

    expect(util.s3.getObject).toHaveBeenCalledTimes(1)
    expect(util.s3.getObject).toHaveBeenCalledWith({
      Bucket: 'staticBucketName',
      Key: 'sdkGeneration.json'
    })

    expect(util.s3.upload).toHaveBeenCalledTimes(1)
    expect(util.s3.upload).toHaveBeenCalledWith({
      Bucket: 'staticBucketName',
      Key: 'sdkGeneration.json',
      Body: JSON.stringify({
        otherapiid_otherstagename: false,
        apiid_stagename: true
      })
    })

    expect(util.lambda.invoke).toHaveBeenCalledTimes(1)
    expect(util.lambda.invoke).toHaveBeenCalledWith({
      FunctionName: 'somebigfunctionarn',
      InvocationType: 'RequestResponse',
      LogType: 'None'
    })

    expect(result).toEqual({ message: 'Success' })
  })

  test('it should not update sdkGeneration.json when it\'s unnecessary', async () => {
    const body = JSON.stringify({
      apiid_stagename: false,
      otherapiid_otherstagename: false
    })

    util.s3.getObject = jest.fn().mockReturnValue(promiser({
      Body: body
    }))
    util.s3.upload = jest.fn().mockReturnValue(promiser())
    util.lambda.invoke = jest.fn().mockReturnValue(promiser())

    process.env.StaticBucketName = 'staticBucketName'
    process.env.CatalogUpdaterFunctionArn = 'somebigfunctionarn'

    const result = await sdkGeneration.idempotentSdkGenerationUpdate(false, 'apiid_stagename')

    expect(util.s3.getObject).toHaveBeenCalledTimes(1)
    expect(util.s3.getObject).toHaveBeenCalledWith({
      Bucket: 'staticBucketName',
      Key: 'sdkGeneration.json'
    })

    expect(util.s3.upload).toHaveBeenCalledTimes(0)
    expect(util.lambda.invoke).toHaveBeenCalledTimes(0)

    expect(result).toEqual({ message: 'Success' })
  })
})
