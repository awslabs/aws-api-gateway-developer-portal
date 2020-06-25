const index = require('../index')

describe('Cognito pre-signup trigger', () => {
  test('should always confirm users with valid emails', async () => {
    const event = {
      userName: 'username',
      request: { userAttributes: { email: 'username@example.com' } }
    }
    const result = await index.handler(event)
    expect(result).toEqual(event)
  })

  test('should reject users with no emails', async () => {
    const event = {
      userName: 'username',
      request: { userAttributes: {} }
    }
    expect(index.handler(event)).rejects.toThrow('Email is required.')
  })

  test('should reject users with invalid emails', async () => {
    const event = {
      userName: 'username',
      request: { userAttributes: { email: 'username' } }
    }
    expect(index.handler(event)).rejects.toThrow('Email is invalid.')
  })
})
