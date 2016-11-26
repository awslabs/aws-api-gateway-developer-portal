import AWS from 'aws-sdk'
export const awsRegion = 'us-east-1'
export const cognitoRegion = 'us-east-1'
export const cognitoUserPoolId = 'YOUR_COGNITO_USER_POOL_ID'
export const cognitoIdentityPoolId = 'YOUR_COGNITO_IDENTITY_POOL_ID'
export const cognitoClientId = 'YOUR_COGNITO_CLIENT_ID'

AWS.config.region = cognitoRegion
