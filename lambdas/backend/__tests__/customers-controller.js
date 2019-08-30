const customers = require('dev-portal-common/customers-controller')
const promiser = require('../../setup-jest').promiser

describe('customersController', () => {
  test('ensureCustomerItem verifies that DDB is up-to-date', async () => {
    let error = jest.fn(),
      callback = jest.fn(),
      entry = {
        Id: 'cognitoIdentityId',
        UserPoolId: 'cognitoUserId',
        ApiKeyId: 'keyId',
      }
    process.env['PreLoginAccountsTableName'] = 'PreLoginAccountsTable'

    customers.dynamoDb.get = jest.fn().mockImplementation(({ TableName }) => {
      if (TableName === 'DevPortalCustomers') {
        return promiser({ Item: entry })
      } else {
        return promiser({ Items: [] })
      }
    })

    let returnValue = await customers.ensureCustomerItem(
      'cognitoIdentityId',
      'cognitoUserId',
      'keyId',
      error,
      callback,
    )

    expect(customers.dynamoDb.get).toHaveBeenCalledTimes(2)
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'PreLoginAccountsTable',
      Key: {
        UserId: 'cognitoUserId',
      },
    })
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'DevPortalCustomers',
      Key: {
        Id: 'cognitoIdentityId',
      },
    })

    expect(returnValue).toEqual(entry)
  })

  test('ensureCustomerItem fixes DDB if it is not up-to-date', async () => {
    let error = jest.fn()
    let callback = jest.fn()

    process.env['PreLoginAccountsTableName'] = 'PreLoginAccountsTable'

    customers.dynamoDb.get = jest
      .fn()
      .mockImplementation(({ TableName }) => {
        if (TableName === 'PreLoginAccountsTable') {
          return promiser({
            UserId: 'cognitoUserId',
            RegistrationStatus: 'registered',
          })
        } else if (TableName === 'CustomersTable') {
          return promiser({})
        }
      })

    customers.dynamoDb.put = jest.fn().mockReturnValue(promiser({}))

    let returnValue = await customers.ensureCustomerItem(
      'cognitoIdentityId',
      'cognitoUserId',
      'keyId',
      error,
      callback,
    )

    // Once for PreLoginAccountsTable, once for CustomersTable
    expect(customers.dynamoDb.get).toHaveBeenCalledTimes(2)
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'PreLoginAccountsTable',
      Key: {
        UserId: 'cognitoUserId',
      },
    })
    expect(customers.dynamoDb.get).toHaveBeenCalledWith({
      TableName: 'DevPortalCustomers',
      Key: {
        Id: 'cognitoIdentityId',
      },
    })

    const expectedPutItem = {
      TableName: 'DevPortalCustomers',
      Item: {
        Id: 'cognitoIdentityId',
        UserPoolId: 'cognitoUserId',
        RegistrationStatus: 'registered',
      },
    }
    expect(customers.dynamoDb.put).toHaveBeenCalledTimes(1)
    expect(customers.dynamoDb.put).toHaveBeenCalledWith(expectedPutItem)

    expect(returnValue).toEqual(expectedPutItem)
  })
})
