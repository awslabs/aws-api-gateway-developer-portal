const customers = require('dev-portal-common/customers-controller')
const promiser = require('../../setup-jest').promiser

describe('customersController', () => {
  const cache = new Map()

  function setEnv (key, value) {
    cache.set(key, process.env[key])
    process.env[key] = value
  }

  afterEach(() => {
    for (const [key, value] of cache) {
      if (value != null) {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  })

  test('ensureCustomerItem verifies that DDB is up-to-date', async () => {
    const error = jest.fn()
    const callback = jest.fn()
    const entry = {
      Id: 'cognitoIdentityId',
      UserPoolId: 'cognitoUserId',
      ApiKeyId: 'keyId'
    }
    setEnv('PreLoginAccountsTableName', 'PreLoginAccountsTable')
    setEnv('CustomersTableName', 'DevPortalCustomers')

    customers.dynamoDb.get = jest.fn().mockImplementation(({ TableName }) => {
      if (TableName === 'DevPortalCustomers') {
        return promiser({ Item: entry })
      } else {
        return promiser({ Items: [] })
      }
    })

    await customers.ensureCustomerItem('cognitoIdentityId', 'cognitoUserId', 'keyId', error, callback)

    expect(customers.dynamoDb.get).toHaveBeenCalledTimes(2)
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'PreLoginAccountsTable',
      Key: {
        UserId: 'cognitoUserId'
      }
    })
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'DevPortalCustomers',
      Key: {
        Id: 'cognitoIdentityId'
      }
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(entry)
  })

  test('ensureCustomerItem fixes DDB if it is not up-to-date', async () => {
    const error = jest.fn()
    const callback = jest.fn()
    // const entry = {
    //   Id: 'cognitoIdentityId',
    //   UserPoolId: 'cognitoUserId',
    //   ApiKeyId: 'keyId'
    // }
    setEnv('PreLoginAccountsTableName', 'PreLoginAccountsTable')
    setEnv('CustomersTableName', 'CustomersTable')

    customers.dynamoDb.get = jest.fn().mockImplementation(({ TableName }) => {
      if (TableName === 'PreLoginAccountsTable') {
        return promiser({
          Item: {
            UserId: 'cognitoUserId',
            RegistrationStatus: 'registered'
          }
        })
      } else if (TableName === 'CustomersTable') {
        return promiser({})
      }
    })

    customers.dynamoDb.put = jest.fn().mockReturnValue(promiser({}))
    customers.dynamoDb.delete = jest.fn().mockReturnValue(promiser({}))

    await customers.ensureCustomerItem('cognitoIdentityId', 'cognitoUserId', 'keyId', error, callback)

    // Once for PreLoginAccountsTable, once for CustomersTable
    expect(customers.dynamoDb.get).toHaveBeenCalledTimes(2)
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'PreLoginAccountsTable',
      Key: {
        UserId: 'cognitoUserId'
      }
    })
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'CustomersTable',
      Key: {
        Id: 'cognitoIdentityId'
      }
    })

    expect(customers.dynamoDb.put).toHaveBeenCalledTimes(1)
    expect(customers.dynamoDb.put).toHaveBeenCalledWith({
      TableName: 'CustomersTable',
      Item: {
        ApiKeyId: 'keyId',
        Id: 'cognitoIdentityId',
        UserPoolId: 'cognitoUserId',
        RegistrationStatus: 'registered'
      }
    })

    expect(customers.dynamoDb.delete).toHaveBeenCalledTimes(1)
    expect(customers.dynamoDb.delete).toHaveBeenCalledWith({
      TableName: 'PreLoginAccountsTable',
      Key: {
        UserId: 'cognitoUserId'
      }
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith({
      ApiKeyId: 'keyId',
      Id: 'cognitoIdentityId',
      UserPoolId: 'cognitoUserId',
      RegistrationStatus: 'registered'
    })
  })

  // test('ensureCustomerItem backfills UserPoolId', async () => {
  //   const error = jest.fn()
  //   const callback = jest.fn()
  //   const oldEntry = {
  //     Id: 'cognitoIdentityId',
  //     ApiKeyId: 'keyId'
  //   }
  //   const entry = {
  //     Id: 'cognitoIdentityId',
  //     UserPoolId: 'cognitoUserId',
  //     ApiKeyId: 'keyId'
  //   }

  //   customers.dynamoDb.get = jest.fn().mockReturnValue(promiser({ Item: oldEntry }))

  //   customers.dynamoDb.put = jest.fn().mockReturnValue(promiser({}))

  //   const returnValue = await customers.ensureCustomerItem('cognitoIdentityId', 'cognitoUserId', 'keyId', error, callback)

  //   expect(customers.dynamoDb.get).toHaveBeenCalledTimes(1)
  //   expect(customers.dynamoDb.get).toHaveBeenCalledWith({
  //     TableName: 'DevPortalCustomers',
  //     Key: {
  //       Id: 'cognitoIdentityId'
  //     }
  //   })

  //   expect(customers.dynamoDb.put).toHaveBeenCalledTimes(1)
  //   expect(customers.dynamoDb.put).toHaveBeenCalledWith({
  //     TableName: 'DevPortalCustomers',
  //     Item: entry
  //   })

  //   expect(returnValue).toEqual(entry)
  // })
})
