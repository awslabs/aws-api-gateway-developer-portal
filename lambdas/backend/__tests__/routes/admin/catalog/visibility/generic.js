const util = require('../../../../../util')
const { promiser, invoke, response, generateEvent } = require('../../../../../../setup-jest')
const adminCatalogVisibilityGeneric = require('../../../../../routes/admin/catalog/visibility/generic')

const originalCatalog = util.catalog

describe('DELETE /admin/catalog/visibility/generic/:id', () => {
  beforeEach(() => {
    util.catalog = jest.fn()
    util.catalog.mockReturnValue(Promise.resolve({
      apiGateway: [
        {
          apis: [
            { apiId: 'unmatched1', apiStage: 'unmatched1' },
            { apiId: 'unmatched2', apiStage: 'unmatched2' },
            { apiId: 'a1b2c3', apiStage: 'prod' }
          ]
        },
        {
          apis: [
            { apiId: 'unmatched3', apiStage: 'unmatched3' },
            { apiId: 'unmatched4', apiStage: 'unmatched4' }
          ]
        }
      ]
    }))
  })

  afterEach(() => {
    util.catalog = originalCatalog
  })

  test('deletes swagger doc from s3 for generic apis', async () => {
    util.s3.deleteObject = jest.fn().mockReturnValue(promiser())

    process.env.StaticBucketName = 'anotherBucket'

    const result = await invoke(adminCatalogVisibilityGeneric, generateEvent({ genericId: 'somebighash123456' }))

    expect(util.s3.deleteObject).toHaveBeenCalledWith({
      Bucket: 'anotherBucket',
      Key: 'catalog/somebighash123456.json'
    })

    expect(result).toEqual(response(200, { message: 'Success' }))
  })
})
