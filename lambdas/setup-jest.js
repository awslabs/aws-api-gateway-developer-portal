// jest setup
global.console.log = jest.fn()
global.console.dir = jest.fn()


// helpers
/**
 * Returns an object with a promise method that returns a promise. Primarily used to mock out the AWS SDKS, which
 * normally use a callback pattern, but return a promise if .promise() is called on them. In most of our code, we use
 * this to promisify the SDK, so this helper exists to make mocking that call easier.
 *
 * Example normal usage of the SDK:
 * s3.getObject(params, options).promise()
 *
 * Example mocking the SDK without this helper:
 * index.s3.getObject = jest.fn().mockReturnValueOnce({
 *     promise: function() {
 *         return Promise.resolve({ Body: fileBody })
 *     }
 * })
 *
 * Example mocking the SDK with this helper:
 * index.s3.getObject = jest.fn().mockReturnValueOnce(promiser({ Body: fileBody }))
 *
 * Example mocking a rejected promise with this helper:
 * index.s3.getObject = jest.fn().mockReturnValueOnce(promiser(null, { Body: fileBody }))
 *
 * @param mockResolveValue, the value the promise returned by promise() will resolve to. Overridden by mockRejectedValue
 * @param mockRejectedValue, the value the promise returned by promise() will reject with. Overrides mockResolveValue
 * @returns {{ Object }}, an object with a promise method that returns a promise
 */
function promiser(mockResolveValue, mockRejectedValue) {
    return {
        promise: function () {
            return !mockRejectedValue ? Promise.resolve(mockResolveValue) : Promise.reject(mockRejectedValue)
        }
    }
}

function generateResponseContext() {
    return {
        status: jest.fn().mockReturnValue({
            json: jest.fn()
        }),
        attachment: jest.fn().mockReturnValue({
            send: jest.fn()
        }),
        send: jest.fn().mockReturnValue({
            send: jest.fn()
        })
    }
}

function generateRequestContext() {
    return {
        apiGateway: {
            event: {
                requestContext: {
                    identity: {
                        cognitoIdentityId: 'qwertyuiop'
                    }
                }
            }
        }
    }
}

// export helpers
exports = module.exports = {
    promiser,
    generateRequestContext,
    generateResponseContext
}
