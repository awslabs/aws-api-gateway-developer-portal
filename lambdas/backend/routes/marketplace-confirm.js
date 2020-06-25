'use strict'

// FIXME: Marketplace support is currently broken

const { inspect } = require('util')
const util = require('../util')

// replace these to match your site URL. Note: Use TLS, not plain HTTP, for your production site!
const domain = `${process.env.CLIENT_BUCKET_NAME}.s3-website-${process.env.AWS_DEFAULT_REGION}.amazonaws.com`
const baseUrl = `http://${domain}/`

exports.post = (req, res) => {
  console.log(`POST /marketplace-confirm for Cognito ID: ${util.getCognitoIdentityId(req)}`)
  // no auth
  // this is the redirect URL for AWS Marketplace products
  // i.e. https://YOUR_API_GATEWAY_API_ID.execute-api.us-east-1.amazonaws.com/prod/marketplace-confirm/[USAGE_PLAN_ID]
  const marketplaceToken = req.body['x-amzn-marketplace-token']

  if (marketplaceToken === null || marketplaceToken === undefined) {
    console.log(`Couldn't find marketplace token. Event: ${inspect(req.apiGateway.event, {
      depth: null,
      colors: true
    })}`)
    res.status(400).json({ message: 'Missing AWS Marketplace token' })
  }

  console.log(`Marketplace token: ${marketplaceToken}`)
  const usagePlanId = req.params.usagePlanId

  // WARNING: the redirect URL should be HTTPS as the token is subject to MITM attacks over HTTP. Token expires after 60min
  // ideally this should be saved in a secure manner (i.e. DDB) until the subscription completes
  const confirmUrl = `${baseUrl}?usagePlanId=${usagePlanId}&token=${marketplaceToken}`

  // redirect to the registration/login page
  res.redirect(302, confirmUrl)
}
