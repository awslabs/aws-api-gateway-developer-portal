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
function promiser (mockResolveValue, mockRejectedValue) {
  return {
    promise: function () {
      return !mockRejectedValue ? Promise.resolve(mockResolveValue) : Promise.reject(mockRejectedValue)
    }
  }
}

function generateResponseContext () {
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

function generateRequestContext () {
  return {
    apiGateway: {
      event: {
        requestContext: {
          identity: {
            cognitoIdentityId: 'qwertyuiop',
            cognitoAuthenticationProvider: 'cognito-idp.us-west-2.amazonaws.com/us-west-2_qwertyuio,cognito-idp.us-west-2.amazonaws.com/us-west-2_asdfghjkl:CognitoSignIn:a1b2c3d4-a1b2-c3d4-e5f6-a1b2c3d4e5f6'
          }
        }
      }
    }
  }
}

function bindEnv () {
  const old = new Map()

  afterEach(() => {
    for (const [key, value] of old) {
      if (value != null) process.env[key] = value
      else delete process.env[key]
    }
    old.clear()
  })

  return function setEnv (key, value) {
    old.set(key, process.env[key])
    process.env[key] = value
  }
}

function makeCatalog () {
  const apiGateway = []
  for (let i = 1; i <= 8; i++) {
    const apis = []
    for (let j = 1; j <= 4; j++) {
      for (let k = 1; k <= 4; k++) {
        apis.push({ id: `plan${i}_api${j}`, stage: `plan${i}_stage${k}` })
      }
    }
    apiGateway.push({ id: `plan${i}`, apis })
  }

  const generic = {}

  for (let i = 1; i <= 8; i++) {
    for (let j = 1; j <= 4; j++) {
      generic[`tracked${i}_${j}`] = { apiId: `tracked_api${i}`, stage: `tracked_stage${j}` }
    }
    generic[`untracked${i}`] = { apiId: `untracked_api${i}` }
  }

  return { apiGateway, generic }
}

// export helpers
exports = module.exports = {
  promiser,
  generateRequestContext,
  generateResponseContext,
  bindEnv,
  makeCatalog
}
