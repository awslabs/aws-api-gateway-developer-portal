import AWS from 'aws-sdk'
export const awsRegion = 'YOUR_PRIMARY_AWS_REGION'
export const cognitoRegion = 'YOUR_COGNITO_REGION'
export const cognitoUserPoolId = 'YOUR_COGNITO_USER_POOL_ID'
export const cognitoIdentityPoolId = 'YOUR_COGNITO_IDENTITY_POOL_ID'
export const cognitoClientId = 'YOUR_COGNITO_CLIENT_ID'

AWS.config.region = cognitoRegion
