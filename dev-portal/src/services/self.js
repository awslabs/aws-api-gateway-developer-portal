// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import AWS from 'aws-sdk'
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js'

// services
import { store } from 'services/state'
import { updateAllUserData } from 'services/api-catalog'
import { initApiGatewayClient, apiGatewayClient, cognitoDomain, cognitoIdentityPoolId, cognitoUserPoolId, cognitoClientId, cognitoRegion } from 'services/api'
import * as jwt_decode from "jwt-decode";

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

export function isAdmin() {
  return store.cognitoUser &&
  `${jwt_decode(store.cognitoUser.signInUserSession.idToken.jwtToken)['cognito:preferred_role']}`
    .includes('-CognitoAdminRole-')
}

export function init() {
  initApiGatewayClient() // init a blank client (will get overwritten if we have creds)

  // attempt to refresh credentials from active session
  userPool = new CognitoUserPool(poolData)
  let cognitoUser = userPool.getCurrentUser()

  if (cognitoUser !== null) {
    cognitoUser.getSession(function(err, session) {
      if (err) {
        logout()
        console.error(err)
        return
      }

      store.cognitoUser = cognitoUser
      setCredentials(cognitoUser)
    })
  } else {
    let signInUserSession,
        parsedToken,
        valid = false

    try {
      signInUserSession = JSON.parse(localStorage.getItem(JSON.stringify(poolData)))
      if (signInUserSession) { // this `if` prevents console.error spam
        parsedToken = jwt_decode(signInUserSession.idToken.jwtToken)
        valid = parsedToken.exp*1000 > new Date()
      }
    } catch (error) { 
      console.error(error)
    }

    if (valid) {
      cognitoUser = new CognitoUser({ Username: parsedToken['cognito:username'], Pool: userPool })
      cognitoUser.signInUserSession = signInUserSession

      store.cognitoUser = cognitoUser
      setCredentials(cognitoUser)
    } else {
      logout()
    }
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

// This is a pretty crazy mess.
//
// Basically, this is a login function that tries one of two ways to login
// and returns a promise that resolves or rejects based on login success
// It's hyper complicated and doesn't need to be and should be simplified 
// once we get rid of the custom login.
export function login(email, password) {
  let cognitoUser

  return new Promise((resolve, reject) => {
    if (window.location.hash) { // assume we're grabbing tokens out of the hash
      // fake the signInUserSession
      let idToken, accessToken, username

      try {
        window.location.hash
          .replace(/^#/, '')
          .split('&')
          .map(param => param.split('='))
          .forEach(param => {
            // record the id_token and access_token
            if (param[0] === 'id_token') idToken = param[1]
            if (param[0] === 'access_token') accessToken = param[1]
          })

        if (idToken) { // we get both, we set both, but we only really care about the idToken
          username = jwt_decode(idToken)['cognito:username']

          cognitoUser = new CognitoUser({ Username: username, Pool: new CognitoUserPool(poolData) })
          cognitoUser.signInUserSession = { idToken: { jwtToken: idToken }, accessToken: { jwtToken: accessToken } }

          localStorage.setItem(JSON.stringify(poolData), JSON.stringify(cognitoUser.signInUserSession))

          store.cognitoUser = cognitoUser
          setCredentials(cognitoUser)

          resolve(cognitoUser)
        }
      } 
      
      catch (error) {
        reject(error)
      }

    } 

    else {
      cognitoUser = new CognitoUser({
        Username: email,
        Pool: new CognitoUserPool(poolData)
      })

      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password
      })

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          store.cognitoUser = cognitoUser
          resolve(setCredentials(store.cognitoUser))
        },

        onFailure: reject
      })
    } 
  })
}

function setCredentials(cognitoUser) {
  let preferred_role =
      jwt_decode(cognitoUser.signInUserSession.idToken.jwtToken)['cognito:preferred_role'],
      params = {
          IdentityPoolId: cognitoIdentityPoolId,
          Logins: {
              [getCognitoLoginKey()]: cognitoUser.signInUserSession.idToken.jwtToken
          }
      }

  if(preferred_role)
    params.RoleArn = preferred_role

  AWS.config.credentials = new AWS.CognitoIdentityCredentials(params)

  return new Promise((resolve, reject) => {
    AWS.config.credentials.refresh((error) => {
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
