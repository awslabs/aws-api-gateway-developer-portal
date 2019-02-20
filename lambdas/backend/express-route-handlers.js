const customersController = require('./_common/customers-controller.js')
const feedbackController = require('./_common/feedback-controller.js')
const catalog = require('./catalog/index.js')
const AWS = require('aws-sdk')
const apigateway = new AWS.APIGateway()


// replace these to match your site URL. Note: Use TLS, not plain HTTP, for your production site!
const domain = `${process.env.CLIENT_BUCKET_NAME}.s3-website-${process.env.AWS_DEFAULT_REGION}.amazonaws.com`
const baseUrl = `http://${domain}/`

const feedbackEnabled = !!process.env['FeedbackSnsTopicArn']

function getCognitoIdentityId(req) {
    return req.apiGateway.event.requestContext.identity.cognitoIdentityId
}

function getUsagePlanFromCatalog(usagePlanId) {
    return catalog()
        .then((catalog) => catalog.apiGateway.find(usagePlan => usagePlan.id === usagePlanId))
}

function postSignIn(req, res) {
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
}

function getCatalog(req, res) {
    catalog()
        .then(catalog => res.status(200).json(catalog))
        .catch(error => res.status(error.statusCode).json(error))
}

function getApiKey(req, res) {
    const cognitoIdentityId = getCognitoIdentityId(req)

    function errFunc(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    customersController.getApiKeyForCustomer(cognitoIdentityId, errFunc, (data) => {
        if (data.items.length === 0) {
            res.status(404).json({ error: 'No API Key for customer' })
        } else {
            const item = data.items[0]
            const key = {
                id: item.id,
                value: item.value
            }
            res.status(200).json(key)
        }
    })
}

function getSubscriptions(req, res) {
    console.log(`GET /subscriptions for Cognito ID: ${req.apiGateway.event.requestContext.identity.cognitoIdentityId}`)

    function errFunc(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    customersController.getUsagePlansForCustomer(req.apiGateway.event.requestContext.identity.cognitoIdentityId, errFunc, (data) => {
        res.status(200).json(data.items)
    })
}

function putSubscription(req, res) {
    const cognitoIdentityId = getCognitoIdentityId(req)
    const usagePlanId = req.params.usagePlanId

    getUsagePlanFromCatalog(usagePlanId).then((usagePlan) => {
        const isUsagePlanInCatalog = Boolean(usagePlan)

        function error(data) {
            console.log(`error: ${data}`)
            res.status(500).json(data)
        }

        function success(data) {
            res.status(201).json(data)
        }

        if (!isUsagePlanInCatalog) {
            res.status(404).json({ error: 'Invalid Usage Plan ID' })
        } else {
            customersController.subscribe(cognitoIdentityId, usagePlanId, error, success)
        }
    })
}

function getUsage(req, res) {
    const cognitoIdentityId = getCognitoIdentityId(req)
    const usagePlanId = req.params.usagePlanId

    function errFunc(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    getUsagePlanFromCatalog(usagePlanId).then((usagePlan) => {
        const isUsagePlanInCatalog = Boolean(usagePlan)

        // could error here if customer is not subscribed to usage plan, or save an extra request by just showing 0 usage
        if (!isUsagePlanInCatalog) {
            res.status(404).json({ error: 'Invalid Usage Plan ID' })
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
}

function deleteSubscription(req, res) {
    const cognitoIdentityId = getCognitoIdentityId(req)
    const usagePlanId = req.params.usagePlanId

    function error(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    function success(data) {
        res.status(200).json(data)
    }

    getUsagePlanFromCatalog(usagePlanId).then((usagePlan) => {
        const isUsagePlanInCatalog = Boolean(usagePlan)

        if (!isUsagePlanInCatalog) {
            res.status(404).json({ error: 'Invalid Usage Plan ID'})
        } else {
            customersController.unsubscribe(cognitoIdentityId, usagePlanId, error, success)
        }
    })
}

function postMarketplaceConfirm(req, res) {
    // no auth
    // this is the redirect URL for AWS Marketplace products
    // i.e. https://YOUR_API_GATEWAY_API_ID.execute-api.us-east-1.amazonaws.com/prod/marketplace-confirm/[USAGE_PLAN_ID]
    const marketplaceToken = req.body['x-amzn-marketplace-token']

    if (marketplaceToken === null || marketplaceToken === undefined) {
        console.log(`Couldn't find marketplace token. Event: ${util.inspect(req.apiGateway.event, {
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

function putMarketplaceSubscription(req, res) {
    const marketplaceToken = req.body.token
    const usagePlanId = req.params.usagePlanId
    console.log(`Marketplace token: ${marketplaceToken} usage plan id: ${usagePlanId}`)
    const cognitoIdentityId = getCognitoIdentityId(req)
    console.log(`cognito id: ${cognitoIdentityId}`)

    function error(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    function success(data) {
        res.status(200).json(data)
    }

    function subscribeCustomerToUsagePlan(data) {
        customersController.subscribe(cognitoIdentityId, usagePlanId, error, success)
    }

    const marketplace = new AWS.MarketplaceMetering()

    const params = {
        RegistrationToken: marketplaceToken
    }

    // call MMS to crack token into marketpltestSingleAccountId_apiKeysConfigace customer ID and product code
    marketplace.resolveCustomer(params, (err, data) => {
        if (err) {
            console.log(`marketplace error: ${JSON.stringify(err)}`)
            res.status(400).json(err.message)
        } else {
            console.log(`marketplace data: ${JSON.stringify(data)}`)

            // persist the marketplaceCustomerId in DDB
            // this is used when the subscription listener receives the subscribe notification
            const marketplaceCustomerId = data.CustomerIdentifier
            customersController.updateCustomerMarketplaceId(cognitoIdentityId, marketplaceCustomerId, error, subscribeCustomerToUsagePlan)
        }
    })
}

function getFeedback(req, res) {
    if (!feedbackEnabled) {
        res.status(401).json("Customer feedback not enabled")
    } else {
        feedbackController.fetchFeedback()
            .then(feedback => {
                res.status(200).json(feedback)
            })
            .catch(err => {
                console.log(`error: ${err}`)
                res.status(500).json(err)
            })
    }
}

function postFeedback(req, res) {
    const cognitoIdentityId = getCognitoIdentityId(req)

    if (!feedbackEnabled) {
        res.status(401).json("Customer feedback not enabled")
    } else {
        feedbackController.submitFeedback(cognitoIdentityId, req.body.message)
            .then(() => res.status(200).json('success'))
            .catch((err) => res.status(500).json(err))
    }
}

async function getAdminCatalogVisibility(req, res) {
    try {
        let visibility = {}, catalogObject = await catalog()

        visibility.apiGateway = await apigateway.getRestApis().item

        visibility.apiGateway.forEach(async (api) => {
            api.stages = await apigateway.getStages().item
        })

        // mark every api gateway managed api-stage in the catalog as visible
        catalogObject.apiGateway.apis.forEach((catalogEntry) => {
            visibility.apiGateway[catalogEntry.id].stages[catalogEntry.stage].visibility = true
        })

        // mark every api in the generic catalog as visible
        catalogObject.generic.forEach((catalogEntry) => {
            visibility.generic[catalogEntry.id] = {
                visibility: true
            }
        })

        // mark every other api gateway managed api-stage as not visible
        visibility.apiGateway.forEach((api) => {
            api.stages.forEach((stage) => {
                if(!stage.visibility) stage.visibility = false
            })
        })

        res.status(200).json(visibility)
    } catch (err) {
        console.log(`error: ${ data }`)
        // TODO: Should this be 'error' or 'message'?
        res.status(500).json({ error: "Internal Server Error" })
    }
}

async function postAdminCatalogVisibility(req, res) {
    // for apigateway managed APIs, provide "apiId_stageName"
    // in the apiKey field
    if(req.apiKey) {
        try {
            let swagger = await apigateway.getExport({
                restApiId: req.apiKey.split('_')[0],
                stageName: req.apiKey.split('_')[1],
                exportType: 'swagger',
                extensions: 'apigateway'
            }), params = {
                Bucket: staticBucketName,
                Key: 'catalog/',
                Body: JSON.stringify(swagger)
            }

            await exports.s3.upload(params).promise()

            res.status(200).json({ message: 'Success' })
        }

    // for generic swagger, just provide the swagger body
    } else if(req.swagger) {
        try {
            let params = {
                Bucket: staticBucketName,
                Key: 'catalog/',
                Body: JSON.stringify(req.swagger)
            }

            await exports.s3.upload(params).promise()

            res.status(200).json({ message: 'Success' })
        }
    } else {
        res.status(400).json({ message: 'Invalid input.' })
    }
}

async function deleteAdminCatalogVisibility(req, res) {
    // for apigateway managed APIs, provide "apiId_stageName"
    // in the apiKey field
    if(req.apiKey) {
        let params = {
            Bucket: staticBucketName,
            // assumed: apiId_stageName.json is the only format
            // no yaml, no autodetection based on file contents
            Key: `catalog/${req.apiKey}.json`
        }

        await exports.s3.delete(params).promise()

        res.status(200).json({ message: 'Success' })

    // for generic swagger, provide the hashed swagger body
    // in the id field
    } else if(req.id) {
        let params = {
            Bucket: staticBucketName,
            Key: `catalog/${req.id}.json`
        }

        await exports.s3.delete(params).promise()

        res.status(200).json({message: 'Success'})
    } else {
        res.status(400).json({message: 'Invalid input.'})
    }
}

exports = module.exports = {
    postSignIn,
    getCatalog,
    getApiKey,
    getSubscriptions,
    putSubscription,
    getUsage,
    deleteSubscription,
    postMarketplaceConfirm,
    putMarketplaceSubscription,
    getFeedback,
    postFeedback,
    getAdminCatalogVisibility,
    postAdminCatalogVisibility,
    deleteAdminCatalogVisibility,
    s3: new AWS.S3()
}
