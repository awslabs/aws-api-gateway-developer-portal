const customers = require('dev-portal-common/customers-controller')
const promiser = require('../../setup-jest').promiser

describe('customersController', () => {
  test('ensureCustomerItem verifies that DDB is up-to-date', async () => {
    const error = jest.fn()
    const callback = jest.fn()
    const entry = {
      Id: 'cognitoIdentityId',
      UserPoolId: 'cognitoUserId',
      ApiKeyId: 'keyId'
    }

    customers.dynamoDb.get = jest.fn().mockReturnValue(promiser({ Item: entry }))

    const returnValue = await customers.ensureCustomerItem('cognitoIdentityId', 'cognitoUserId', 'keyId', error, callback)

    expect(customers.dynamoDb.get).toHaveBeenCalledTimes(1)
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'DevPortalCustomers',
      Key: {
        Id: 'cognitoIdentityId'
      }
    })

    expect(returnValue).toEqual(entry)
  })

  test('ensureCustomerItem fixes DDB if it is not up-to-date', async () => {
    const error = jest.fn()
    const callback = jest.fn()
    const entry = {
      Id: 'cognitoIdentityId',
      UserPoolId: 'cognitoUserId',
      ApiKeyId: 'keyId'
    }

    customers.dynamoDb.get = jest.fn().mockReturnValue(promiser({ Item: undefined }))

    customers.dynamoDb.put = jest.fn().mockReturnValue(promiser({}))

    const returnValue = await customers.ensureCustomerItem('cognitoIdentityId', 'cognitoUserId', 'keyId', error, callback)

    expect(customers.dynamoDb.get).toHaveBeenCalledTimes(1)
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'DevPortalCustomers',
      Key: {
        Id: 'cognitoIdentityId'
      }
    })

    expect(customers.dynamoDb.put).toHaveBeenCalledTimes(1)
    expect(customers.dynamoDb.put).toHaveBeenCalledWith({
      TableName: 'DevPortalCustomers',
      Item: entry
    })

    expect(returnValue).toEqual(entry)
  })

  test('ensureCustomerItem backfills UserPoolId', async () => {
    const error = jest.fn()
    const callback = jest.fn()
    const oldEntry = {
      Id: 'cognitoIdentityId',
      ApiKeyId: 'keyId'
    }
    const entry = {
      Id: 'cognitoIdentityId',
      UserPoolId: 'cognitoUserId',
      ApiKeyId: 'keyId'
    }

    customers.dynamoDb.get = jest.fn().mockReturnValue(promiser({ Item: oldEntry }))

    customers.dynamoDb.put = jest.fn().mockReturnValue(promiser({}))

    const returnValue = await customers.ensureCustomerItem('cognitoIdentityId', 'cognitoUserId', 'keyId', error, callback)

    expect(customers.dynamoDb.get).toHaveBeenCalledTimes(1)
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'DevPortalCustomers',
      Key: {
        Id: 'cognitoIdentityId'
      }
    })

    expect(customers.dynamoDb.put).toHaveBeenCalledTimes(1)
    expect(customers.dynamoDb.put).toHaveBeenCalledWith({
      TableName: 'DevPortalCustomers',
      Item: entry
    })

    expect(returnValue).toEqual(entry)
  })
})
