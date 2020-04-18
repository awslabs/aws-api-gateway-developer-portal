const AWS = require('aws-sdk')
const notifyCFN = require('dev-portal-common/notify-cfn')

exports.handler = async (event, context) => {
  try {
    let responseData
    switch (event.RequestType) {
      case 'Create':
      case 'Update':
        var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider()

        responseData = await cognitoIdentityServiceProvider.updateUserPoolClient({
          UserPoolId: event.ResourceProperties.UserPoolId,
          ClientId: event.ResourceProperties.UserPoolClientId,
          SupportedIdentityProviders: event.ResourceProperties.SupportedIdentityProviders,
          // make sure these are array-wrapped, but not double-wrapped
          CallbackURLs: Array.isArray(event.ResourceProperties.CallbackURL)
            ? event.ResourceProperties.CallbackURL
            : [event.ResourceProperties.CallbackURL],
          LogoutURLs: Array.isArray(event.ResourceProperties.LogoutURL)
            ? event.ResourceProperties.LogoutURL
            : [event.ResourceProperties.LogoutURL],
          AllowedOAuthFlowsUserPoolClient: (event.ResourceProperties.AllowedOAuthFlowsUserPoolClient === 'true'),
          AllowedOAuthFlows: event.ResourceProperties.AllowedOAuthFlows,
          AllowedOAuthScopes: event.ResourceProperties.AllowedOAuthScopes
        }).promise()

        break

      case 'Delete': break // these are just extra settings on a userPoolClient, so we don't actually do a delete action
    }

    // trim a useless layer of JSON
    if (responseData && responseData.UserPoolClient) { responseData = responseData.UserPoolClient }

    // try to use the User Pool id (plus '-Settings') as the ID
    let physicalResourceId

    if (responseData && responseData.UserPoolId) { physicalResourceId = responseData.UserPoolId + '-Settings' }

    await notifyCFN.ofSuccess({ event, context, responseData, physicalResourceId })

    console.info(`CognitoUserPoolClientSettings Success for request type ${event.RequestType}`)
  } catch (error) {
    await notifyCFN.ofFailure({ error, event, context })

    console.error(`CognitoUserPoolClientSettings Error for request type ${event.RequestType}:`, error)
  }
}
