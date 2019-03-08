const customersController = require('./_common/customers-controller.js')
const feedbackController = require('./_common/feedback-controller.js')
const AWS = require('aws-sdk')
const catalog = require('./catalog/index')


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
    console.log(`POST /signin for Cognito ID: ${cognitoIdentityId}`)

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
    console.log(`GET /catalog for Cognito ID: ${getCognitoIdentityId(req)}`)
    catalog()
        .then(catalog => res.status(200).json(catalog))
        .catch(error => res.status(error.statusCode).json(error))
}

function getApiKey(req, res) {
    const cognitoIdentityId = getCognitoIdentityId(req)
    console.log(`GET /apikey for Cognito ID: ${cognitoIdentityId}`)

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
    let cognitoIdentityId = getCognitoIdentityId(req)
    console.log(`GET /subscriptions for Cognito ID: ${cognitoIdentityId}`)

    function errFunc(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    customersController.getUsagePlansForCustomer(cognitoIdentityId, errFunc, (data) => {
        res.status(200).json(data.items)
    })
}

function putSubscription(req, res) {
    const cognitoIdentityId = getCognitoIdentityId(req)
    console.log(`PUT /subscriptions for Cognito ID: ${cognitoIdentityId}`)
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
    console.log(`GET /usage for Cognito ID: ${cognitoIdentityId}`)
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

                exports.apigateway.getUsage(params, (err, usageData) => {
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
    console.log(`DELETE /subscriptions for Cognito ID: ${cognitoIdentityId}`)
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
    console.log(`POST /marketplace-confirm for Cognito ID: ${getCognitoIdentityId(req)}`)
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
    const cognitoIdentityId = getCognitoIdentityId(req)
    console.log(`PUT /marketplace-subscriptions/:usagePlanId for Cognito ID: ${cognitoIdentityId}`)

    const marketplaceToken = req.body.token
    const usagePlanId = req.params.usagePlanId
    console.log(`Marketplace token: ${marketplaceToken} usage plan id: ${usagePlanId}`)
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
    console.log(`GET /feedback for Cognito ID: ${getCognitoIdentityId(req)}`)

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
    console.log(`POST /feedback for Cognito ID: ${cognitoIdentityId}`)

    if (!feedbackEnabled) {
        res.status(401).json("Customer feedback not enabled")
    } else {
        feedbackController.submitFeedback(cognitoIdentityId, req.body.message)
            .then(() => res.status(200).json('success'))
            .catch((err) => res.status(500).json(err))
    }
}

async function getAdminCatalogVisibility(req, res) {
    console.log(`GET /admin/catalog/visibility for Cognito ID: ${getCognitoIdentityId(req)}`)
    try {

        let visibility = { apiGateway: [] }, catalogObject = await catalog(),
            apis = (await exports.apigateway.getRestApis().promise()).items

        let promises = []
        apis.forEach((api) => {
            promises.push(
                exports.apigateway.getStages({ restApiId: api.id }).promise()
                    .then((response) => response.item)
                    .then((stages) => stages.forEach(stage => visibility.apiGateway.push({
                        id: api.id,
                        stage: stage.stageName,
                        visibility: false
                    })))
            )
        })
        await Promise.all(promises)

        console.dir(visibility)

        // mark every api gateway managed api-stage in the catalog as visible
        catalogObject.apiGateway.forEach((usagePlan) => {
            usagePlan.apis.forEach((api) => {
                console.dir(api)
                visibility.apiGateway.map((apiEntry) => {
                    if(apiEntry.id === api.id && apiEntry.stage === api.stage) apiEntry.visibility = true
                    return apiEntry
                })
            })
        })

        // mark every api in the generic catalog as visible
        catalogObject.generic.forEach((catalogEntry) => {
            visibility.generic = {}

            visibility.generic[catalogEntry.id] = {
                visibility: true
            }
        })

        res.status(200).json(visibility)
    } catch (err) {
        console.error(`error: ${ err.stack }`)

        // TODO: Should this be 'error' or 'message'?
        res.status(500).json({ error: 'Internal Server Error' })
    }
}

async function postAdminCatalogVisibility(req, res) {
    console.log(`POST /admin-catalog-visibility for Cognito ID: ${getCognitoIdentityId(req)}`)
    // for apigateway managed APIs, provide "apiId_stageName"
    // in the apiKey field
    if(req.body && req.body.apiKey) {
        // try {
            let swagger = await exports.apigateway.getExport({
                restApiId: req.body.apiKey.split('_')[0],
                stageName: req.body.apiKey.split('_')[1],
                exportType: 'swagger',
                extensions: 'apigateway'
            }).promise()

            let params = {
                Bucket: process.env.StaticBucketName,
                Key: 'catalog/',
                Body: JSON.stringify(swagger)
            }

            await exports.s3.upload(params).promise()

            res.status(200).json({ message: 'Success' })
        // }

    // for generic swagger, just provide the swagger body
    } else if(req.body && req.body.swagger) {
        // try {
            let params = {
                Bucket: process.env.StaticBucketName,
                Key: 'catalog/',
                Body: JSON.stringify(req.body.swagger)
            }

            await exports.s3.upload(params).promise()

            res.status(200).json({ message: 'Success' })
        // }
    } else {
        res.status(400).json({ message: 'Invalid input' })
    }
}

async function deleteAdminCatalogVisibility(req, res) {
    console.log(`DELETE /admin/catalog/visibility for Cognito ID: ${getCognitoIdentityId(req)}`)
    // for apigateway managed APIs, provide "apiId_stageName"
    // in the apiKey field
    if(req.body && req.body.apiKey) {
        let params = {
            Bucket: process.env.StaticBucketName,
            // assumed: apiId_stageName.json is the only format
            // no yaml, no autodetection based on file contents
            Key: `catalog/${ req.body.apiKey }.json`
        }

        await exports.s3.delete(params).promise()

        res.status(200).json({ message: 'Success' })

    // for generic swagger, provide the hashed swagger body
    // in the id field
    } else if(req.body && req.body.id) {
        let params = {
            Bucket: process.env.StaticBucketName,
            Key: `catalog/${ req.body.id }.json`
        }

        await exports.s3.delete(params).promise()

        res.status(200).json({ message: 'Success' })
    } else {
        res.status(400).json({ message: 'Invalid input' })
    }
}


/**
 * Takes an API id (either in the api gateway manaaged APIID_STAGENAME format or the generic HASHEDID format) and a
 * parity (desired state) of the sdkGeneration flag for that API, and updates the file sdkGeneration.json in the static
 * asset bucket in S3. It does this by reading the contents of sdkGeneration.json, then, if the specified API's state
 * is not already the desired state, it uploads the modified sdkGeneration.json and invokes catalogUpdater to "build"
 * the changes from sdkGeneration.json into catalog.json.
 *
 * Note that this DOES NOT RETURN! Instead, it ends the lambda runtime by calling `res...json()`.
 *
 * @param {boolean} parity the desired result of the 'sdkGeneration' flag for the API with 'id' of id
 * @param {String} id the id of the API to be modified
 * @param {Object} res an express response object
 */
async function idempotentSdkGenerationUpdate(parity, id, res) {
    let sdkGeneration =
        JSON.parse((await exports.s3.getObject({
            Bucket: process.env.StaticBucketName,
            Key: 'sdkGeneration.json'
        }).promise()).Body)

    if (sdkGeneration[id] !== parity) {
        sdkGeneration[id] = parity

        await exports.s3.upload({
            Bucket: process.env.StaticBucketName,
            Key: 'sdkGeneration.json',
            Body: JSON.stringify(sdkGeneration)
        }).promise()

        // call catalogUpdater to build a fresh catalog.json that includes changes from sdkGeneration.json
        await exports.lambda.invoke({
            FunctionName: process.env.CatalogUpdaterFunctionArn,
            // this API would be more performant if we moved to 'Event' invocations, but then we couldn't signal to
            // admins when the catalog updater failed to update the catalog; they'd see a 200 and then no change in
            // behavior.
            InvocationType: 'RequestResponse',
            LogType: 'None'
        }).promise()

        res.status(200).json({ message: 'Success' })
    } else {
        res.status(200).json({ message: 'Success' })
    }
}

async function putAdminCatalogSdkGeneration(req, res) {
    console.log(`PUT /admin/catalog/${req.params.id}/sdkGeneration for Cognito ID: ${getCognitoIdentityId(req)}`)

    await exports.idempotentSdkGenerationUpdate(true, req.params.id, res)
}

async function deleteAdminCatalogSdkGeneration(req, res) {
    console.log(`DELETE /admin/catalog/${req.params.id}/sdkGeneration for Cognito ID: ${getCognitoIdentityId(req)}`)

    await exports.idempotentSdkGenerationUpdate(false, req.params.id, res)
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
    putAdminCatalogSdkGeneration,
    deleteAdminCatalogSdkGeneration,
    idempotentSdkGenerationUpdate,
    s3: new AWS.S3(),
    apigateway: new AWS.APIGateway(),
    lambda: new AWS.Lambda()
}
