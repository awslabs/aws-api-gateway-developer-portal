import { awsRegion } from './aws'

let cachedClient

export function initApiGatewayClient({ accessKeyId, secretAccessKey, sessionToken } = {}) {
  cachedClient = window.apigClientFactory.newClient({
    accessKey: accessKeyId,
    secretKey: secretAccessKey,
    sessionToken: sessionToken,
    region: awsRegion
  })
}

export function apiGatewayClient() {
  if (cachedClient) return Promise.resolve(cachedClient)
  
  return new Promise(resolve => {
    const poller = setInterval(() => {
      if (cachedClient) {
        clearInterval(poller)
        resolve(cachedClient)
      }
    }, 100)
  })
}
