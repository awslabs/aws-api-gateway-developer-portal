// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import AWS from 'aws-sdk'
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js'

// services
import { store } from 'services/state'
import { initApiGatewayClient, apiGatewayClient } from 'services/api'
import { updateAllUserData } from 'services/api-catalog'
import { cognitoIdentityPoolId, cognitoUserPoolId, cognitoClientId, cognitoRegion } from 'services/api'

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

      const cognitoLoginKey = getCognitoLoginKey()
      const Logins = {}
      Logins[cognitoLoginKey] = session.getIdToken().getJwtToken()
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: cognitoIdentityPoolId,
        Logins: Logins
      })

      AWS.config.credentials.refresh((error) => {
        if (error) {
          logout()
          console.error(error)
        } else {
          initApiGatewayClient(AWS.config.credentials)
          updateAllUserData()
        }
      })
    })
  } else {
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
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password
    })

    let localCognitoUser = new CognitoUser({
      Username: email,
      Pool: new CognitoUserPool(poolData)
    })

    return new Promise((resolve, reject) => {
      localCognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {

          store.cognitoUser = localCognitoUser

          AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: cognitoIdentityPoolId,
            Logins: {
              [getCognitoLoginKey()]: result.getIdToken().getJwtToken()
            }
          })

          AWS.config.credentials.refresh((error) => {
            if (error) {
              console.error(error)
            } else {
              initApiGatewayClient(AWS.config.credentials)

              updateAllUserData()

              apiGatewayClient().then(apiGatewayClient => 
                apiGatewayClient.post('/signin', {}, {}, {})
                  .then(resolve)
                  .catch(reject)
              )
            }
          })
        },

        onFailure: reject
    })
  })
}

export function logout() {
  if (store.cognitoUser) {
    store.cognitoUser.signOut()
    store.resetUserData()
    localStorage.clear()
  }
}
