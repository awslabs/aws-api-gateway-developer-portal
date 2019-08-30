const index = require('../index')

test('should always confirm users', async () => {
  const event = {
    userName: 'username',
    request: { userAttributes: {} },
  }
  const result = await index.handler(event)
  expect(result).toEqual(event)
})
