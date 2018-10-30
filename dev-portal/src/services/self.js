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

let cognitoUser
let userPool

export function isAuthenticated() {
  return cognitoUser
}

function getCognitoLoginKey() {
  return `cognito-idp.${cognitoRegion}.amazonaws.com/${cognitoUserPoolId}`
}

export function init() {
  // attempt to refresh credentials from active session
  userPool = new CognitoUserPool(poolData)
  cognitoUser = userPool.getCurrentUser()

  if (cognitoUser !== null) {
    cognitoUser.getSession(function(err, session) {
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

    cognitoUser = new CognitoUser({
      Username: email,
      Pool: new CognitoUserPool(poolData)
    })

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {

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
  if (cognitoUser) {
    cognitoUser.signOut()
    cognitoUser = null
    store.subscriptions = []
    localStorage.clear()
  }
}
