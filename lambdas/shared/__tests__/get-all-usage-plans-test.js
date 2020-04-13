const { getAllUsagePlans } = require('dev-portal-common/get-all-usage-plans')

const promiser = require('../../setup-jest').promiser

const mockUsagePlanItem = () => ({
  id: '1a2b3c',
  name: '1a2b3c',
  apiStages: [
    {
      apiId: 'anmlcrckrs',
      stage: 'prod'
    },
    {
      apiId: 'jlpnochips',
      stage: 'beta'
    }
  ],
  throttle: {
    burstLimit: 10,
    rateLimit: 10
  },
  quota: {
    limit: 10000,
    offset: 0,
    period: 'DAY'
  }
})

describe('getAllUsagePlans', () => {
  test('returns all usage plans, when none exist', async () => {
    const mockApiGateway = {
      getUsagePlans: jest.fn().mockReturnValueOnce(promiser({
        items: []
      }))
    }

    const result = await getAllUsagePlans(mockApiGateway)
    const mocked = mockApiGateway.getUsagePlans.mock
    expect(mocked.calls.length).toBe(1)
    expect(mocked.calls[0][0]).not.toHaveProperty('position')
    expect(result).toHaveLength(0)
  })

  test('returns all usage plans, when only one page of usage plans exists', async () => {
    const mockApiGateway = {
      getUsagePlans: jest.fn().mockReturnValueOnce(promiser({
        items: [
          mockUsagePlanItem(),
          mockUsagePlanItem(),
          mockUsagePlanItem(),
          mockUsagePlanItem()
        ]
      }))
    }

    const result = await getAllUsagePlans(mockApiGateway)
    const mocked = mockApiGateway.getUsagePlans.mock
    expect(mocked.calls.length).toBe(1)
    expect(mocked.calls[0][0]).not.toHaveProperty('position')
    expect(result).toHaveLength(4)
  })

  test('returns all usage plans, when multiple pages of usage plans exist', async () => {
    const mockApiGateway = {
      getUsagePlans: jest.fn().mockReturnValueOnce(promiser({
        items: [
          mockUsagePlanItem(),
          mockUsagePlanItem(),
          mockUsagePlanItem(),
          mockUsagePlanItem()
        ],
        position: 'qwertyuiopasdf%3D%3D'
      })).mockReturnValueOnce(promiser({
        items: [
          mockUsagePlanItem(),
          mockUsagePlanItem(),
          mockUsagePlanItem(),
          mockUsagePlanItem()
        ],
        position: 'zxcvbnm1234567%3D%3D'
      })).mockReturnValueOnce(promiser({
        items: [
          mockUsagePlanItem(),
          mockUsagePlanItem()
        ]
      }))
    }

    const result = await getAllUsagePlans(mockApiGateway)
    const mocked = mockApiGateway.getUsagePlans.mock
    expect(mocked.calls.length).toBe(3)
    expect(mocked.calls[0][0]).not.toHaveProperty('position')
    expect(mocked.calls[1][0]).toHaveProperty('position', 'qwertyuiopasdf%3D%3D')
    expect(mocked.calls[2][0]).toHaveProperty('position', 'zxcvbnm1234567%3D%3D')
    expect(result).toHaveLength(10)
  })

  test('passes through an API Gateway request error', async () => {
    const expectedError = {}
    const mockApiGateway = {
      getUsagePlans: jest.fn().mockReturnValueOnce(promiser(null, expectedError))
    }

    await expect(getAllUsagePlans(mockApiGateway)).rejects.toStrictEqual(expectedError)
  })
})
