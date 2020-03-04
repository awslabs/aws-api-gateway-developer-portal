const confirmationStrategy = require('../index')

test('should always confirm users', () => {
  const mockCallback = jest.fn()
  const event = {}

  confirmationStrategy.handler(event, {}, mockCallback)

  expect(mockCallback).toHaveBeenCalledTimes(1)
  expect(mockCallback).toHaveBeenCalledWith(null, { response: { autoConfirmUser: true } })
})
