// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import AWS from 'aws-sdk'

import _ from 'lodash'

export const awsRegion = _.get(window, 'config.region')
export const cognitoRegion = _.get(window, 'config.region')
export const cognitoUserPoolId = _.get(window, 'config.userPoolId')
export const cognitoIdentityPoolId = _.get(window, 'config.identityPoolId')
export const cognitoClientId = _.get(window, 'config.userPoolClientId')
export const cognitoDomain = _.get(window, 'config.userPoolDomain')

AWS.config.region = cognitoRegion

let cachedClient
let cachedClientWithCredentials

export function initApiGatewayClient ({ accessKeyId, secretAccessKey, sessionToken } = {}) {
  cachedClient = window.apigClientFactory.newClient({
    accessKey: accessKeyId,
    secretKey: secretAccessKey,
    sessionToken: sessionToken,
    region: awsRegion
  })

  if (accessKeyId && secretAccessKey && sessionToken) {
    cachedClientWithCredentials = cachedClient
  }

  window.apigw = cachedClient
}

export function apiGatewayClient () {
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

export function apiGatewayClientWithCredentials () {
  if (cachedClientWithCredentials) { return Promise.resolve(cachedClientWithCredentials) }
  return new Promise(resolve => {
    const poller = setInterval(() => {
      if (cachedClientWithCredentials) {
        clearInterval(poller)
        resolve(cachedClientWithCredentials)
      }
    }, 100)
  })
}
