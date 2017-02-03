import AWS from 'aws-sdk'
export const awsRegion = 'ap-southeast-2'
export const cognitoRegion = 'ap-southeast-2'
export const cognitoUserPoolId = 'ap-southeast-2_sZtrKeRmm'
export const cognitoIdentityPoolId = 'ap-southeast-2:5601faef-3999-4ded-8371-fd0f3b291a65'
export const cognitoClientId = '5acfm2154151lk01hbn244rdg7'

AWS.config.region = cognitoRegion
