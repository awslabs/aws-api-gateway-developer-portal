import AWS from 'aws-sdk'
import {config} from '../../../package.json'

export const awsRegion = config.primaryAwsRegion
export const cognitoRegion = config.cognitoRegion
export const cognitoUserPoolId = config.cognitoUserPoolId
export const cognitoIdentityPoolId = config.cognitoIdentityPoolId
export const cognitoClientId = config.cognitoClientId

AWS.config.region = cognitoRegion
