const customers = require('dev-portal-common/customers-controller')
const pager = require('dev-portal-common/pager')
const { promiser, bindEnv, bindMock } = require('../../setup-jest')

describe('customersController', () => {
  const setEnv = bindEnv()

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

  describe('createAccountInvite()', () => {
    const setEnv = bindEnv()
    const originalCognitoListUsers = customers.cognitoIdp.listUsers
    const originalCognitoAdminCreateUser = customers.cognitoIdp.adminCreateUser
    const originalDynamoDBPut = customers.dynamoDb.put

    afterEach(() => {
      customers.cognitoIdp.listUsers = originalCognitoListUsers
      customers.cognitoIdp.adminCreateUser = originalCognitoAdminCreateUser
      customers.cognitoIdp.put = originalDynamoDBPut
    })

    test('creates an account invite for a new account', async () => {
      setEnv('UserPoolId', 'user-pool-id')
      setEnv('PreLoginAccountsTableName', 'user-bucket-id')
      const adminSub = 'a1b2c3d4-a1b2-c3d4-e5f6-a1b2c3d4e5f6'
      const userSub = '12345678-1234-5678-9abc-123456789abc'
      customers.cognitoIdp.listUsers = jest.fn().mockReturnValue(promiser({
        Users: [
          { Attributes: [{ Name: 'email', Value: 'admin@example.com' }] }
        ]
      }))
      customers.cognitoIdp.adminCreateUser = jest.fn().mockReturnValue(promiser({
        User: {
          Username: userSub,
          Attributes: [
            { Name: 'email', Value: 'user@example.com' },
            { Name: 'sub', Value: userSub }
          ]
        }
      }))
      customers.dynamoDb.put = jest.fn().mockReturnValue(promiser('new account'))

      const result = await customers.createAccountInvite({
        targetEmailAddress: 'user@example.com',
        inviterUserId: 'admin@example.com',
        inviterUserSub: adminSub
      })

      expect(customers.cognitoIdp.listUsers).toHaveBeenCalledTimes(1)
      expect(customers.cognitoIdp.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ Filter: `sub = "${adminSub}"`, UserPoolId: 'user-pool-id' })
      )
      expect(customers.cognitoIdp.adminCreateUser).toHaveBeenCalledTimes(1)
      expect(customers.cognitoIdp.adminCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ Username: 'user@example.com', UserPoolId: 'user-pool-id' })
      )
      expect(customers.dynamoDb.put).toHaveBeenCalledTimes(1)
      expect(customers.dynamoDb.put).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'user-bucket-id',
          Item: expect.objectContaining({
            Username: userSub,
            InviterEmailAddress: 'admin@example.com'
          })
        })
      )

      expect(result).toMatchObject({
        Username: userSub,
        InviterEmailAddress: 'admin@example.com'
      })
    })
  })

  describe('deleteAccountByUserId()', () => {
    const setEnv = bindEnv()
    const originalCognitoAdminDeleteUser = customers.cognitoIdp.adminDeleteUser
    const originalDynamoDBGet = customers.dynamoDb.get
    const originalDynamoDBDelete = customers.dynamoDb.delete
    const originalPagerFetchItemsInDynamoDbTable = pager.fetchItemsInDynamoDbTable
    const originalPagerFetchApiGatewayApiKeys = pager.fetchApiGatewayApiKeys

    afterEach(() => {
      customers.cognitoIdp.adminDeleteUser = originalCognitoAdminDeleteUser
      customers.dynamoDb.get = originalDynamoDBGet
      customers.dynamoDb.delete = originalDynamoDBDelete
      pager.fetchItemsInDynamoDbTable = originalPagerFetchItemsInDynamoDbTable
      pager.fetchApiGatewayApiKeys = originalPagerFetchApiGatewayApiKeys
    })

    test('deletes an existing account', async () => {
      setEnv('UserPoolId', 'user-pool-id')
      setEnv('PreLoginAccountsTableName', 'user-bucket-id')
      setEnv('CustomersTableName', 'TestCustomersTable')
      const userSub = '12345678-1234-5678-9abc-123456789abc'

      customers.dynamoDb.get = jest.fn(() => promiser({ Item: 'foo' }))
      customers.dynamoDb.delete = jest.fn().mockReturnValue(promiser())
      customers.cognitoIdp.adminDeleteUser = jest.fn().mockReturnValue(promiser())
      pager.fetchItemsInDynamoDbTable = jest.fn(async () => [])
      pager.fetchApiGatewayApiKeys = jest.fn(async () => [])

      await customers.deleteAccountByUserId(userSub)

      expect(customers.dynamoDb.get).toHaveBeenCalledTimes(1)
      expect(customers.dynamoDb.get).toHaveBeenCalledWith({
        Key: { UserId: '12345678-1234-5678-9abc-123456789abc' },
        TableName: 'user-bucket-id'
      })
      expect(customers.dynamoDb.delete).toHaveBeenCalledTimes(1)
      expect(customers.dynamoDb.delete).toHaveBeenCalledWith({
        Key: { UserId: '12345678-1234-5678-9abc-123456789abc' },
        TableName: 'user-bucket-id'
      })
      expect(customers.cognitoIdp.adminDeleteUser).toHaveBeenCalledTimes(1)
      expect(customers.cognitoIdp.adminDeleteUser).toHaveBeenCalledWith({
        UserPoolId: 'user-pool-id',
        Username: userSub
      })
      expect(pager.fetchItemsInDynamoDbTable).toHaveBeenCalledTimes(1)
      expect(pager.fetchItemsInDynamoDbTable).toHaveBeenCalledWith({
        dynamoDbClient: customers.dynamoDb,
        extraParams: {
          ExpressionAttributeValues: {
            ':userId': '12345678-1234-5678-9abc-123456789abc'
          },
          FilterExpression: 'UserPoolId = :userId'
        },
        tableName: 'TestCustomersTable'
      })
      expect(pager.fetchApiGatewayApiKeys).toHaveBeenCalledTimes(0)
    })
  })

  describe('addAccountToAdminsGroup()', () => {
    const setEnv = bindEnv()
    const setMock = bindMock()

    const isoDateRegexp = /^\d{4,}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{2,}Z$/

    test('promotes an existing non-admin account in pre-login table to admin', async () => {
      setEnv('UserPoolId', 'user-pool-id')
      setEnv('PreLoginAccountsTableName', 'user-bucket-id')
      setEnv('CustomersTableName', 'TestCustomersTable')
      setEnv('AdminsGroupName', 'TestAdminGroup')

      const promoterName = 'promoter@example.com'
      const promoterId = '98765432-9876-5432-1098-987654321098'
      const promoterSub = 'a1b2c3d4-a1b2-c3d4-e5f6-a1b2c3d4e5f6'
      const userId = '12345678-1234-5678-9abc-123456789abc'

      setMock(customers.cognitoIdp, 'adminListGroupsForUser').mockReturnValue(promiser({
        Groups: [{ GroupName: 'TestUserGroup' }]
      }))
      setMock(customers.cognitoIdp, 'listUsers').mockReturnValue(promiser({
        Users: [
          { Attributes: [{ Name: 'email', Value: promoterName }] }
        ]
      }))
      setMock(customers.dynamoDb, 'get', opts => {
        if (opts.TableName === 'user-bucket-id') {
          return promiser({ Item: { IdentityId: userId } })
        }
        return promiser({ Item: null })
      })
      setMock(customers.dynamoDb, 'scan').mockReturnValue(promiser({ Items: [] }))
      setMock(customers.dynamoDb, 'put').mockReturnValue(promiser('updated account'))
      setMock(customers.cognitoIdp, 'adminAddUserToGroup')
        .mockReturnValue(promiser('updated user'))

      await customers.addAccountToAdminsGroup({
        targetUserId: userId,
        promoterUserId: promoterId,
        promoterUserSub: promoterSub
      })

      expect(customers.cognitoIdp.adminListGroupsForUser).toHaveBeenCalledTimes(1)
      expect(customers.cognitoIdp.adminListGroupsForUser).toHaveBeenCalledWith(
        expect.objectContaining({
          Username: userId,
          UserPoolId: 'user-pool-id'
        })
      )

      expect(customers.cognitoIdp.listUsers).toHaveBeenCalledTimes(1)
      expect(customers.cognitoIdp.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          Filter: `sub = "${promoterSub}"`,
          Limit: 1,
          AttributesToGet: ['email'],
          UserPoolId: 'user-pool-id'
        })
      )

      expect(customers.dynamoDb.get).toHaveBeenCalledTimes(1)
      expect(customers.dynamoDb.get).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'user-bucket-id',
          Key: { UserId: userId }
        })
      )

      expect(customers.dynamoDb.scan).toHaveBeenCalledTimes(0)

      expect(customers.dynamoDb.put).toHaveBeenCalledTimes(1)
      expect(customers.dynamoDb.put).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'user-bucket-id',
          Item: expect.objectContaining({
            IdentityId: userId,
            PromoterUserId: promoterId,
            PromoterEmailAddress: promoterName,
            DatePromoted: expect.stringMatching(isoDateRegexp)
          }),
          ConditionExpression: 'attribute_exists(UserId)'
        })
      )

      expect(customers.cognitoIdp.adminAddUserToGroup).toHaveBeenCalledTimes(1)
      expect(customers.cognitoIdp.adminAddUserToGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          GroupName: 'TestAdminGroup',
          UserPoolId: 'user-pool-id',
          Username: userId
        })
      )
    })

    test('promotes an existing non-admin account in customers table to admin', async () => {
      setEnv('UserPoolId', 'user-pool-id')
      setEnv('PreLoginAccountsTableName', 'user-bucket-id')
      setEnv('CustomersTableName', 'TestCustomersTable')
      setEnv('AdminsGroupName', 'TestAdminGroup')

      const promoterName = 'promoter@example.com'
      const promoterId = '98765432-9876-5432-1098-987654321098'
      const promoterSub = 'a1b2c3d4-a1b2-c3d4-e5f6-a1b2c3d4e5f6'
      const userId = '12345678-1234-5678-9abc-123456789abc'

      setMock(customers.cognitoIdp, 'adminListGroupsForUser').mockReturnValue(promiser({
        Groups: [{ GroupName: 'TestUserGroup' }]
      }))
      setMock(customers.cognitoIdp, 'listUsers').mockReturnValue(promiser({
        Users: [
          { Attributes: [{ Name: 'email', Value: promoterName }] }
        ]
      }))
      setMock(customers.dynamoDb, 'get', opts => {
        if (opts.TableName === 'TestCustomersTable') {
          return promiser({ Item: { IdentityId: userId } })
        }
        return promiser({ Item: null })
      })
      setMock(customers.dynamoDb, 'scan').mockReturnValue(promiser({
        Items: [{ Id: userId }]
      }))
      setMock(customers.dynamoDb, 'put').mockReturnValue(promiser('updated account'))
      setMock(customers.cognitoIdp, 'adminAddUserToGroup')
        .mockReturnValue(promiser('updated user'))

      await customers.addAccountToAdminsGroup({
        targetUserId: userId,
        promoterUserId: promoterId,
        promoterUserSub: promoterSub
      })

      expect(customers.cognitoIdp.adminListGroupsForUser).toHaveBeenCalledTimes(1)
      expect(customers.cognitoIdp.adminListGroupsForUser).toHaveBeenCalledWith(
        expect.objectContaining({
          Username: userId,
          UserPoolId: 'user-pool-id'
        })
      )

      expect(customers.cognitoIdp.listUsers).toHaveBeenCalledTimes(1)
      expect(customers.cognitoIdp.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          Filter: `sub = "${promoterSub}"`,
          Limit: 1,
          AttributesToGet: ['email'],
          UserPoolId: 'user-pool-id'
        })
      )

      expect(customers.dynamoDb.get).toHaveBeenCalledTimes(1)
      expect(customers.dynamoDb.get).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'user-bucket-id',
          Key: { UserId: userId }
        })
      )

      expect(customers.dynamoDb.scan).toHaveBeenCalledTimes(1)
      expect(customers.dynamoDb.scan).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'TestCustomersTable',
          FilterExpression: 'UserPoolId = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        })
      )

      expect(customers.dynamoDb.put).toHaveBeenCalledTimes(1)
      expect(customers.dynamoDb.put).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'TestCustomersTable',
          Item: expect.objectContaining({
            Id: userId,
            PromoterUserId: promoterId,
            PromoterEmailAddress: promoterName,
            DatePromoted: expect.stringMatching(isoDateRegexp)
          }),
          ConditionExpression: 'attribute_exists(Id)'
        })
      )

      expect(customers.cognitoIdp.adminAddUserToGroup).toHaveBeenCalledTimes(1)
      expect(customers.cognitoIdp.adminAddUserToGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          GroupName: 'TestAdminGroup',
          UserPoolId: 'user-pool-id',
          Username: userId
        })
      )
    })

    test('does not re-promote an existing admin account', async () => {
      setEnv('UserPoolId', 'user-pool-id')
      setEnv('PreLoginAccountsTableName', 'user-bucket-id')
      setEnv('CustomersTableName', 'TestCustomersTable')
      setEnv('AdminsGroupName', 'TestAdminGroup')

      const promoterId = '98765432-9876-5432-1098-987654321098'
      const promoterSub = 'a1b2c3d4-a1b2-c3d4-e5f6-a1b2c3d4e5f6'
      const userId = '12345678-1234-5678-9abc-123456789abc'

      setMock(customers.cognitoIdp, 'adminListGroupsForUser').mockReturnValue(promiser({
        Groups: [{ GroupName: 'TestUserGroup' }, { GroupName: 'TestAdminGroup' }]
      }))
      setMock(customers.cognitoIdp, 'listUsers')
      setMock(customers.dynamoDb, 'get')
      setMock(customers.dynamoDb, 'scan')
      setMock(customers.dynamoDb, 'put')
      setMock(customers.cognitoIdp, 'adminAddUserToGroup')

      await customers.addAccountToAdminsGroup({
        targetUserId: userId,
        promoterUserId: promoterId,
        promoterUserSub: promoterSub
      })

      expect(customers.cognitoIdp.adminListGroupsForUser).toHaveBeenCalledTimes(1)
      expect(customers.cognitoIdp.adminListGroupsForUser).toHaveBeenCalledWith(
        expect.objectContaining({
          Username: userId,
          UserPoolId: 'user-pool-id'
        })
      )

      expect(customers.cognitoIdp.listUsers).toHaveBeenCalledTimes(0)
      expect(customers.dynamoDb.get).toHaveBeenCalledTimes(0)
      expect(customers.dynamoDb.scan).toHaveBeenCalledTimes(0)
      expect(customers.dynamoDb.put).toHaveBeenCalledTimes(0)
      expect(customers.cognitoIdp.adminAddUserToGroup).toHaveBeenCalledTimes(0)
    })
  })
})
