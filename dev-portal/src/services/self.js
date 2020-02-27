// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import AWS from 'aws-sdk'

// services
import { store } from 'services/state'
import { updateAllUserData } from 'services/api-catalog'
import { initApiGatewayClient, apiGatewayClient, cognitoDomain, cognitoIdentityPoolId, cognitoUserPoolId, cognitoClientId, cognitoRegion } from 'services/api'
import * as jwtDecode from 'jwt-decode'

export function isAuthenticated () {
  return store.idToken
}

function getPreferredRole () {
  return jwtDecode(store.idToken)['cognito:preferred_role'] || ''
}

export function isRegistered () {
  if (!store.idToken) {
    return false
  }

  const role = getPreferredRole()
  return (
    role.includes('-CognitoAdminRole-') ||
    role.includes('-CognitoRegisteredRole-')
  )
}

export function isAdmin () {
  return store.idToken && getPreferredRole().includes('-CognitoAdminRole-')
}

export function init () {
  initApiGatewayClient() // init a blank client (will get overwritten if we have creds)

  // attempt to refresh credentials from active session

  let idToken
  let parsedToken
  let valid = false

  try {
    idToken = window.localStorage.getItem(cognitoUserPoolId)
    if (idToken) { // this `if` prevents console.error spam
      parsedToken = jwtDecode(idToken)
      valid = parsedToken.exp * 1000 > new Date()
    }
  } catch (error) {
    console.error(error)
  }

  if (valid) {
    store.idToken = idToken
    setCredentials()
  } else {
    logout()
  }
}

export function login () {
  return new Promise((resolve, reject) => {
    let idToken
    // let accessToken, username

    try {
      window.location.hash
        .replace(/^#/, '')
        .split('&')
        .map(param => param.split('='))
        .forEach(param => {
          // record the id_token and access_token
          if (param[0] === 'id_token') idToken = param[1]
          // if (param[0] === 'access_token') accessToken = param[1]
        })

      if (idToken) { // we get both, we set both, but we only really care about the idToken
        // username = jwtDecode(idToken)['cognito:username']

        window.localStorage.setItem(cognitoUserPoolId, idToken)

        store.idToken = idToken

        setCredentials()

        resolve(idToken)
      }
    } catch (error) {
      reject(error)
    }
  })
}

export const getLoginRedirectUrl = () =>
  `${window.location.protocol}//${window.location.host}/index.html?action=login`
export const getLogoutRedirectUrl = () =>
  `${window.location.protocol}//${window.location.host}/index.html?action=logout`

function setCredentials () {
  const preferredRole = jwtDecode(store.idToken)['cognito:preferred_role']
  const params = {
    IdentityPoolId: cognitoIdentityPoolId,
    Logins: {
      [`cognito-idp.${cognitoRegion}.amazonaws.com/${cognitoUserPoolId}`]: store.idToken
    }
  }

  if (preferredRole) params.RoleArn = preferredRole

  AWS.config.credentials = new AWS.CognitoIdentityCredentials(params)

  return new Promise((resolve, reject) => {
    AWS.config.credentials.refresh(error => {
      if (error) {
        console.error(error)
        return reject(error)
      }

      initApiGatewayClient(AWS.config.credentials)
      updateAllUserData()

      return apiGatewayClient()
        .then(apiGatewayClient => apiGatewayClient.post('/signin', {}, {}, {}))
    })
  })
}

export function logout () {
  if (store.idToken) {
    store.resetUserData()
    window.localStorage.clear()

    if (cognitoDomain) {
      // redirect to cognito to log out there, too
      const redirectUrl = getLogoutRedirectUrl()
      window.location = `${cognitoDomain}/logout?client_id=${cognitoClientId}&logout_uri=${redirectUrl}`
    }
  }
}
