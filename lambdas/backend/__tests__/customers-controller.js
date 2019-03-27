const customers = require('../_common/customers-controller')
const promiser = require('../../setup-jest').promiser

describe('customersController', () => {
    test('ensureCustomerItem verifies that DDB is up-to-date', async () => {
        let error = jest.fn(),
            callback = jest.fn(),
            entry = {
                Id: 'cognitoIdentityId',
                UserPoolId: 'cognitoUserId',
                ApiKeyId: 'keyId'
            }

        customers.dynamoDb.get = jest.fn().mockReturnValue(promiser({ Item: entry }))

        let returnValue = await customers.ensureCustomerItem('cognitoIdentityId', 'cognitoUserId', 'keyId', error, callback)

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
        let error = jest.fn(),
            callback = jest.fn(),
            entry = {
                Id: 'cognitoIdentityId',
                UserPoolId: 'cognitoUserId',
                ApiKeyId: 'keyId'
            }

        customers.dynamoDb.get = jest.fn().mockReturnValue(promiser({ Item: undefined }))

        customers.dynamoDb.put = jest.fn().mockReturnValue(promiser({}))

        let returnValue = await customers.ensureCustomerItem('cognitoIdentityId', 'cognitoUserId', 'keyId', error, callback)

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
        let error = jest.fn(),
            callback = jest.fn(),
            oldEntry = {
                Id: 'cognitoIdentityId',
                ApiKeyId: 'keyId'
            },
            entry = {
                Id: 'cognitoIdentityId',
                UserPoolId: 'cognitoUserId',
                ApiKeyId: 'keyId'
            }

        customers.dynamoDb.get = jest.fn().mockReturnValue(promiser({ Item: oldEntry }))

        customers.dynamoDb.put = jest.fn().mockReturnValue(promiser({}))

        let returnValue = await customers.ensureCustomerItem('cognitoIdentityId', 'cognitoUserId', 'keyId', error, callback)

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