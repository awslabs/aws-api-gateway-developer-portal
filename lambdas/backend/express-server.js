'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const util = require('util')
const AWS = require('aws-sdk')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const catalog = require('./catalog.json')
const customersController = require('common-lambda-assets/customers-controller.js')

const app = express()
const apigateway = new AWS.APIGateway()

// replace these to match your site URL. Note: Use TLS, not plain HTTP, for your production site!
const domain = 'YOUR_CLIENT_BUCKET_NAME.s3-website-YOUR_PRIMARY_AWS_REGION.amazonaws.com'
const baseUrl = `http://${domain}/`

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(awsServerlessExpressMiddleware.eventContext())

// no auth
// app.post('/register', (req, res) => {
//     console.log(util.inspect(req))
//
//     res.json({})
// })

app.post('/signin', (req, res) => {
    const cognitoIdentityId = getCognitoIdentityId(req)

    function errFunc(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    // ensure an API Key exists for this customer and that the Cognito identity and API Key Id are tracked in DDB
    customersController.getApiKeyForCustomer(cognitoIdentityId, errFunc, (data) => {
        console.log(`Get Api Key data ${JSON.stringify(data)}`)

        if (data.items.length === 0) {
            console.log(`No API Key found for customer ${cognitoIdentityId}`)

            customersController.createApiKey(cognitoIdentityId, errFunc, (createData) => {
                console.log(`Create API Key data: ${createData}`)
                const keyId = createData.id

                console.log(`Got key ID ${keyId}`)

                customersController.ensureCustomerItem(cognitoIdentityId, keyId, errFunc, () => {
                    res.status(200).json({})
                })
            })
        } else {
            const keyId = data.items[0].id

            customersController.ensureCustomerItem(cognitoIdentityId, keyId, errFunc, () => {
                res.status(200).json({})
            })
        }
    })
})

// the API catalog could be statically defined (catalog.json), or generated from API Gateway Usage Plans (See getUsagePlans())
app.get('/catalog', (req, res) => {
    res.status(200).json(catalog)
})

app.get('/apikey', (req, res) => {
    const cognitoIdentityId = getCognitoIdentityId(req)

    function errFunc(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    customersController.getApiKeyForCustomer(cognitoIdentityId, errFunc, (data) => {
        if (data.items.length === 0) {
            res.status(404).json('No API Key for customer')
        } else {
            const item = data.items[0]
            const key = {
                id: item.id,
                value: item.value
            }
            res.status(200).json(key)
        }
    })
})

app.get('/subscriptions', (req, res) => {
    console.log(`GET /subscriptions for Cognito ID: ${req.apiGateway.event.requestContext.identity.cognitoIdentityId}`)

    function errFunc(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    customersController.getUsagePlansForCustomer(req.apiGateway.event.requestContext.identity.cognitoIdentityId, errFunc, (data) => {
        res.status(200).json(data.items)
    })
})

app.put('/subscriptions/:usagePlanId', (req, res) => {
    const cognitoIdentityId = getCognitoIdentityId(req)
    const usagePlanId = req.params.usagePlanId

    const usagePlanInCatalog = catalog.find(c => c.usagePlanId === usagePlanId)

    function error(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    function success(data) {
       res.status(201).json(data)
    }

    if (!usagePlanInCatalog) {
        res.status(404).json('Invalid Usage Plan ID')
    } else {
        customersController.subscribe(cognitoIdentityId, usagePlanId, error, success)
    }
})

app.get('/subscriptions/:usagePlanId/usage', (req, res) => {
    const cognitoIdentityId = getCognitoIdentityId(req)
    const usagePlanId = req.params.usagePlanId

    function errFunc(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    const usagePlanInCatalog = catalog.find(c => c.usagePlanId === usagePlanId)

    // could error here if customer is not subscribed to usage plan, or save an extra request by just showing 0 usage
    if (!usagePlanInCatalog) {
        res.status(404).json('Invalid Usage Plan ID')
    } else {
        customersController.getApiKeyForCustomer(cognitoIdentityId, errFunc, (data) => {
            const keyId = data.items[0].id

            const params = {
                endDate: req.query.end,
                startDate: req.query.start,
                usagePlanId,
                keyId,
                limit: 1000
            }

            apigateway.getUsage(params, (err, usageData) => {
                if (err) {
                    console.log(`get usage err ${JSON.stringify(err)}`)
                    errFunc(err)
                } else {
                    console.log(`get usage data ${JSON.stringify(usageData)}`)
                    res.status(200).json(usageData)
                }
            })
        })
    }
})

app.delete('/subscriptions/:usagePlanId', (req, res) => {
    const cognitoIdentityId = getCognitoIdentityId(req)
    const usagePlanId = req.params.usagePlanId

    function error(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    function success(data) {
        res.status(200).json(data)
    }

    const usagePlanInCatalog = catalog.find(c => c.usagePlanId === usagePlanId)

    if (!usagePlanInCatalog) {
        res.status(404).json('Invalid Usage Plan ID')
    } else {
        customersController.unsubscribe(cognitoIdentityId, usagePlanId, error, success)
    }
})

// no auth
// this is the redirect URL for AWS Marketplace products
// i.e. https://YOUR_API_GATEWAY_API_ID.execute-api.us-east-1.amazonaws.com/prod/marketplace-confirm/[USAGE_PLAN_ID]
app.post('/marketplace-confirm/:usagePlanId', (req, res) => {
    const marketplaceToken = req.body['x-amzn-marketplace-token']

    if (marketplaceToken === null || marketplaceToken === undefined) {
        console.log(`Couldn't find marketplace token. Event: ${util.inspect(req.apiGateway.event, { depth: null, colors: true })}`)
        res.status(400).json({ message: 'Missing AWS Marketplace token' })
    }

    console.log(`Marketplace token: ${marketplaceToken}`)
    const usagePlanId = req.params.usagePlanId

    // WARNING: the redirect URL should be HTTPS as the token is subject to MITM attacks over HTTP. Token expires after 60min
    // ideally this should be saved in a secure manner (i.e. DDB) until the subscription completes
    const confirmUrl = `${baseUrl}marketplace-subscribe.html?usagePlanId=${usagePlanId}&token=${marketplaceToken}`

    // redirect to the registration/login page
    res.redirect(302, confirmUrl)
})

app.put('/marketplace-subscriptions/:usagePlanId', (req, res) => {
    const marketplaceToken = req.body.token
    const usagePlanId = req.params.usagePlanId
    const cognitoIdentityId = getCognitoIdentityId(req)

    console.log(`Marketplace token: ${marketplaceToken} usage plan id: ${usagePlanId} cognito id: ${cognitoIdentityId}`)

    function error(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    function success(data) {
        res.status(200).json(data)
    }

    const marketplace = new AWS.MarketplaceMetering()

    const params = {
        RegistrationToken: marketplaceToken
    }

    // call MMS to crack token into marketplace customer ID and product code
    marketplace.resolveCustomer(params, (err, data) => {
        if (err) {
            console.log(`marketplace error: ${JSON.stringify(err)}`)
            res.status(400).json(err.data.message)
        } else {
            console.log(`marketplace data: ${JSON.stringify(data)}`)

            // persist the marketplaceCustomerId in DDB
            // this is used when the subscription listener receives the subscribe notification
            const marketplaceCustomerId = data.CustomerIdentifier
            customersController.updateCustomerMarketplaceId(cognitoIdentityId, marketplaceCustomerId, error, success)
        }
    })
})

function getCognitoIdentityId(req) {
    return req.apiGateway.event.requestContext.identity.cognitoIdentityId
}

// The aws-serverless-express library creates a server and listens on a Unix
// Domain Socket for you, so you can remove the usual call to app.listen.
// app.listen(3000)

// Export your express server so you can import it in the lambda function.
module.exports = app
