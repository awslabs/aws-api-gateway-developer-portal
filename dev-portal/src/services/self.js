// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import AWS from 'aws-sdk'
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js'

// services
import { store } from 'services/state'
import { updateAllUserData } from 'services/api-catalog'
import { initApiGatewayClient, apiGatewayClient, cognitoDomain, cognitoIdentityPoolId, cognitoUserPoolId, cognitoClientId, cognitoRegion } from 'services/api'

const poolData = {
  UserPoolId: cognitoUserPoolId,
  ClientId: cognitoClientId
}

let userPool

export function isAuthenticated() {
  return store.cognitoUser
}

function getCognitoLoginKey() {
  return `cognito-idp.${cognitoRegion}.amazonaws.com/${cognitoUserPoolId}`
}

export function init() {
  // attempt to refresh credentials from active session
  userPool = new CognitoUserPool(poolData)
  store.cognitoUser = userPool.getCurrentUser()

  if (store.cognitoUser !== null) {
    store.cognitoUser.getSession(function(err, session) {
      if (err) {
        logout()
        console.error(err)
        return
      }

      setCredentials(store.cognitoUser)
    })
  } else {
    let signInUserSession = localStorage.getItem(JSON.stringify(poolData))
    if (signInUserSession) {
      
      store.cognitoUser = new CognitoUser({
        Username: '', // blank user name if we aren't using username and password
        Pool: userPool
      })

      store.cognitoUser.signInUserSession = JSON.parse(signInUserSession)

      setCredentials(store.cognitoUser)
    }
    initApiGatewayClient()
  }
}

export function register(email, password) {
  localStorage.clear()
  const attributeList = []
  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attributeList, null, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(login(email, password))
      }
    })
  })
}

export function login(email, password) {
  let localCognitoUser = new CognitoUser({
    Username: email || '', // blank user name if we aren't using username and password
    Pool: new CognitoUserPool(poolData)
  })

  if (email && password) {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password
      })

      localCognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          store.cognitoUser = localCognitoUser

          setCredentials(store.cognitoUser)
            .then(resolve)
            .catch(reject)
        },

        onFailure: reject
      })
    })
  } else if (window.location.hash) { // assume we're grabbing tokens out of the hash
    // fake the signInUserSession
    localCognitoUser.signInUserSession = {}

    window.location.hash
      .replace(/^#/,'')
      .split('&')
      .map(param => param.split('='))
      .forEach(param => {
        // add real data to the fake signInUserSession
        if (param[0] === 'id_token')
          localCognitoUser.signInUserSession.idToken = { jwtToken: param[1] }

        if (param[0] === 'access_token')
          localCognitoUser.signInUserSession.accessToken = { jwtToken: param[1] }

        // will use this value to auto-log out... eventually
        // if (param[0] === 'expires_in')
          // console.log(param[1])
      })

    if (localCognitoUser.signInUserSession.idToken) {
      localStorage.setItem(JSON.stringify(poolData), JSON.stringify(localCognitoUser.signInUserSession))

      store.cognitoUser = localCognitoUser

      setCredentials(store.cognitoUser)
    }
  }
}

function setCredentials(cognitoUser) {
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: cognitoIdentityPoolId,
    Logins: {
      [getCognitoLoginKey()]: cognitoUser.signInUserSession.idToken.jwtToken
    }
  })

  AWS.config.credentials.refresh((error) => {
    if (error) {
      console.error(error)
      return Promise.reject(error)
    }

    initApiGatewayClient(AWS.config.credentials)
    updateAllUserData()

    return apiGatewayClient()
      .then(apiGatewayClient => apiGatewayClient.post('/signin', {}, {}, {}))
  })
}

export function logout() {
  if (store.cognitoUser) {
    store.cognitoUser.signOut()
    store.resetUserData()
    localStorage.clear()

    if (cognitoDomain) {
      // redirect to cognito to log out there, too
      window.location = `${cognitoDomain}/logout?client_id=${cognitoClientId}&logout_uri=${window.location.protocol}//${window.location.host}`;
    }
  }
}
