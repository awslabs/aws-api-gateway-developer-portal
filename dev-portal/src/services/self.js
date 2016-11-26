import AWS from 'aws-sdk'
import $ from 'jquery'
// import CognitoIdentity from 'aws-sdk/clients/cognitoidentity'
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js'
import { cognitoIdentityPoolId, cognitoUserPoolId, cognitoClientId, cognitoRegion } from './aws'
import { showError } from './misc'
import { initApiGatewayClient, apiGatewayClient } from './api'
import { clearSubscriptions } from './api-catalog'

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
    // try {
    //   $('#show-api-key-button').popover({trigger: 'manual'}).on('click', showApiKey)
    // } catch (e) {}

    cognitoUser.getSession(function(err, session) {
      if (err) {
        showError(err)
        return
      }
      console.log('session validity: ' + session.isValid())
      const cognitoLoginKey = getCognitoLoginKey()
      const Logins = {}
      Logins[cognitoLoginKey] = session.getIdToken().getJwtToken()
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: cognitoIdentityPoolId,
        Logins: Logins
      })

      AWS.config.credentials.refresh((error) => {
        if (error) {
            showError(error)
        } else {
          console.log('Successfully logged in')

          initApiGatewayClient(AWS.config.credentials)
        }
      })
    })
  } else {
    initApiGatewayClient()
    if (!/index\.html/.test(window.location.href)) {
      // window.location = 'index.html'
      return
    } else {
      window.localStorage.removeItem('aws.cognito.identity-id.' + cognitoIdentityPoolId)
      window.localStorage.removeItem('aws.cognito.identity-providers.' + cognitoIdentityPoolId)
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
        const cognitoUser = result.user

        login(email, password)
        resolve()
      }
    })
  })
}

export function login(email, password) {
    const authenticationData = {
      Username: email,
      Password: password
    }
    const authenticationDetails = new AuthenticationDetails(authenticationData)
    userPool = new CognitoUserPool(poolData)
    const userData = {
      Username: email,
      Pool: userPool
    }

    const cognitoUser = new CognitoUser(userData)
    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          console.log('access token + ' + result.getAccessToken().getJwtToken())

          const cognitoLoginKey = getCognitoLoginKey()
          const Logins = {}
          Logins[cognitoLoginKey] = result.getIdToken().getJwtToken()
          AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: cognitoIdentityPoolId,
            Logins: Logins
          })

          AWS.config.credentials.refresh((error) => {
            if (error) {
              console.error(error)
            } else {
              console.log('Successfully logged in')

              initApiGatewayClient(AWS.config.credentials)

              apiGatewayClient.post('/signin', {}, {}, {}).then((result) => {
                resolve(result)
              }).catch((err) => {
                reject(err)
              })
            }
          })
        },

        onFailure: (err) => {
          reject(err)
        }
    })
  })
}

export function logout() {
  cognitoUser.signOut()
  cognitoUser = null
  clearSubscriptions()
  localStorage.clear()
}

export function showApiKey() {
  return apiGatewayClient.get('/apikey', {}, {}, {}).then((result) => {
    return result.data.value
  }).catch((err) => {
      showError(JSON.stringify(err))
  })
}
