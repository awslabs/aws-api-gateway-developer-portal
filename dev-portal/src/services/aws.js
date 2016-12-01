import AWS from 'aws-sdk'
export const awsRegion = 'us-east-1'
export const cognitoRegion = 'us-east-1'
export const cognitoUserPoolId = 'us-east-1_8M1tvuIV8'
export const cognitoIdentityPoolId = 'us-east-1:93c008a9-adaf-442d-8da2-1f00b539bcd0'
export const cognitoClientId = '6cpmle8j5kdmt7qrlj2aid43bc'

AWS.config.region = cognitoRegion
