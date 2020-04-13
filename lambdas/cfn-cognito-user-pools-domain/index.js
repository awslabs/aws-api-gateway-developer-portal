const AWS = require('aws-sdk')
const notifyCFN = require('dev-portal-common/notify-cfn')

exports.handler = async (event, context) => {
  try {
    var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider()
    let responseData

    switch (event.RequestType) {
      case 'Create':
        await cognitoIdentityServiceProvider.createUserPoolDomain({
          UserPoolId: event.ResourceProperties.UserPoolId,
          Domain: event.ResourceProperties.Domain
        }).promise()

        responseData = await cognitoIdentityServiceProvider.describeUserPoolDomain({
          Domain: event.ResourceProperties.Domain
        }).promise()

        break

      case 'Update':
        // The only way to change the -domain- on a domain (as opposed to the cert)
        // is to delete and recreate. we're making the assumption that an update is
        // for a new domain. When we support custom domains, would be a good idea
        // to make this logic a bit smarter.
        await deleteUserPoolDomain(cognitoIdentityServiceProvider, event.OldResourceProperties.Domain)

        await cognitoIdentityServiceProvider.createUserPoolDomain({
          UserPoolId: event.ResourceProperties.UserPoolId,
          Domain: event.ResourceProperties.Domain
        }).promise()

        responseData = await cognitoIdentityServiceProvider.describeUserPoolDomain({
          Domain: event.ResourceProperties.Domain
        }).promise()

        break

      case 'Delete':
        await deleteUserPoolDomain(cognitoIdentityServiceProvider, event.ResourceProperties.Domain)

        break
    }

    // trim a useless layer of json
    if (responseData && responseData.DomainDescription) { responseData = responseData.DomainDescription }

    // try to use the User Pool is (plus '-Settings') as the ID
    let physicalResourceId

    if (responseData && responseData.UserPoolId) {
      physicalResourceId = responseData.UserPoolId + '-Domain-' + responseData.Domain

      // generate the url
      if (responseData.CustomDomainConfig && responseData.CustomDomainConfig.CertificateArn) {
        // is a custom domain
        responseData.FullUrl = `https://${responseData.Domain}`
      } else {
        // isn't a custom domain
        responseData.FullUrl = `https://${responseData.Domain}.auth.${responseData.UserPoolId.split('_')[0]}.amazoncognito.com`
      }
    }

    await notifyCFN.ofSuccess({ event, context, responseData, physicalResourceId })

    console.info(`CognitoUserPoolDomain Success for request type ${event.RequestType}`)
  } catch (error) {
    await notifyCFN.ofFailure({ event, context, error })

    console.error(`CognitoUserPoolDomain Error for request type ${event.RequestType}:`, error)
  }
}

async function deleteUserPoolDomain (cognitoIdentityServiceProvider, domain) {
  var response = await cognitoIdentityServiceProvider.describeUserPoolDomain({
    Domain: domain
  }).promise()

  if (response.DomainDescription.Domain) {
    await cognitoIdentityServiceProvider.deleteUserPoolDomain({
      UserPoolId: response.DomainDescription.UserPoolId,
      Domain: domain
    }).promise()
  }
}
