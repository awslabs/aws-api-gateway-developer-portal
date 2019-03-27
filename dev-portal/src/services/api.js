// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import AWS from 'aws-sdk'

export const awsRegion = window.config.region
export const cognitoRegion = window.config.region
export const cognitoUserPoolId = window.config.userPoolId
export const cognitoIdentityPoolId = window.config.identityPoolId
export const cognitoClientId = window.config.userPoolClientId
export const cognitoDomain = window.config.userPoolDomain

AWS.config.region = cognitoRegion

let cachedClient

export function initApiGatewayClient({ accessKeyId, secretAccessKey, sessionToken } = {}) {
  cachedClient = window.apigClientFactory.newClient({
    accessKey: accessKeyId,
    secretKey: secretAccessKey,
    sessionToken: sessionToken,
    region: awsRegion
  })

  window.apigw = cachedClient
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
