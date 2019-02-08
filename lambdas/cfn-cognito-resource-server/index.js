const AWS = require('aws-sdk');
const notifyCFN = require('./notify-cfn')


exports.handler = async (event, context) => {
  try {
    let cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider(),
      responseData,
      physicalResourceId,
      scopes = [{
        ScopeDescription: 'Normal user access',
        ScopeName: 'user.access'
      }]

    switch (event.RequestType) {
      case 'Create':
        if(event.ResourceProperties.Admin) {
          scopes.push({
            ScopeDescription: 'Admin access',
            ScopeName: 'admin.access'
          })
        }

        responseData = await cognitoIdentityServiceProvider.createResourceServer({
          Identifier: event.ResourceProperties.Identifier,
          UserPoolId: event.ResourceProperties.UserPoolId,
          Name: event.ResourceProperties.Identifier,
          Scopes: scopes
        }).promise()

        if (responseData && responseData.UserPoolId && responseData.Identifier) {
          physicalResourceId = `${ responseData.UserPoolId }:${ responseData.Identifier }`
        }

        break;

      case 'Update':
        // the only param is userPoolId, and we don't expect/want customers to change that
        // so just notify CFN that we succeeded

        break;

      case 'Delete':
        console.log('This here is a delete!')
        console.log('cognitoIdentityServiceProvider.deleteResourceServer:' + cognitoIdentityServiceProvider.deleteResourceServer)
        responseData = await cognitoIdentityServiceProvider.deleteResourceServer({
          Identifier: event.ResourceProperties.Identifier,
          UserPoolId: event.ResourceProperties.UserPoolId
        });

        break;
    }

    await notifyCFN.ofSuccess({ event, context, responseData, physicalResourceId })

    console.info(`CognitoResourceServer Success for request type ${event.RequestType}`);

  } catch (error) {

    await notifyCFN.ofFailure({ event, context, error })

    console.error(`CognitoResourceServer Error for request type ${event.RequestType}:`, error);
  }
}