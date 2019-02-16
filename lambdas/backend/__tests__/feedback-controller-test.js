const promiser = require('../../setup-jest').promiser
const controller = require('../_common/feedback-controller')

const userId = 'test-id'
const message = 'your site is really cool'

describe('submitFeedback', () => {
  test('should call dynamoDb.put', async () => {
    controller.dynamoDb.put = jest.fn().mockReturnValue(promiser())
    controller.sns.publish = jest.fn().mockReturnValue(promiser())

    const expectedInputs = {
      UserId: userId,
      Message: message
    }

    await controller.submitFeedback(userId, message)

    expect(controller.dynamoDb.put).toHaveBeenNthCalledWith(1, expect.objectContaining({
      Item: expect.objectContaining(expectedInputs)
    }))
  })

  test('should call sns.publish', async () => {
    controller.sns.publish = jest.fn().mockReturnValue(promiser())
    controller.dynamoDb.put = jest.fn().mockReturnValue(promiser())

    const expectedInputs = {
      Subject: 'Received customer feedback on your developer portal',
      Message: message
    }

    await controller.submitFeedback(userId, message)

    expect(controller.sns.publish).toHaveBeenNthCalledWith(1, expect.objectContaining(expectedInputs))
  })

  test('should not publish to sns topic if save to dynamo fails', async () => {
    controller.dynamoDb.put = jest.fn().mockReturnValue(promiser(null, 'error'))

    try {
      await controller.submitFeedback(userId, message)
    } catch (err) {
      // expected since we threw the 'error' above
    }

    expect(controller.dynamoDb.put).toHaveBeenCalledTimes(1)
    expect(controller.sns.publish).not.toHaveBeenCalled()
  })
})

describe('fetchFeedback', async () => {
  test('should paginate when necessary', async () => {
    const expectedOutput = [
      {
        Message: 'message-1',
        UserId: 'user-1'
      },
      {
        Message: 'message-2',
        UserId: 'user-2'
      }
    ]

    controller.dynamoDb.scan = jest
      .fn()
      .mockReturnValueOnce(promiser({
        Items: [{
          Message: 'message-1',
          UserId: 'user-1'
        }],
        LastEvaluatedKey: 'key'
      }))
      .mockReturnValueOnce(promiser({
        Items: [{
          Message: 'message-2',
          UserId: 'user-2'
        }]
      }))

      const result = await controller.fetchFeedback()
      
      expect(controller.dynamoDb.scan).toHaveBeenCalledTimes(2)
      expect(result).toEqual(expectedOutput)
  })
})
