// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import AWS from 'aws-sdk'

export const awsRegion = window.config.region
export const cognitoRegion = window.config.region
export const cognitoUserPoolId = window.config.userPoolId
export const cognitoClientId = window.config.userPoolClientId
export const cognitoDomain = window.config.userPoolDomain
export const cognitoAdminUserPoolId = window.config.adminUserPoolId
export const cognitoAdminClientId = window.config.adminUserPoolClientId
export const cognitoAdminDomain = window.config.adminUserPoolDomain

AWS.config.region = cognitoRegion

let cachedClient

export function initApiGatewayClient(jwtToken) {
  cachedClient = window.apigClientFactory.newClient({
    region: awsRegion,
    jwtToken: jwtToken
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
