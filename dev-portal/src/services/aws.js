import AWS from 'aws-sdk'
export const awsRegion = window.config.region
export const cognitoRegion = window.config.region
export const cognitoUserPoolId = window.config.userPoolId
export const cognitoIdentityPoolId = window.config.identityPoolId
export const cognitoClientId = window.config.userPoolClientId

AWS.config.region = cognitoRegion
