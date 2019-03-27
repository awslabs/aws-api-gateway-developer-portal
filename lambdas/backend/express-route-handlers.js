const customersController = require('./_common/customers-controller.js')
const feedbackController = require('./_common/feedback-controller.js')
const AWS = require('aws-sdk')
const catalog = require('./catalog/index')
const hash = require('object-hash')

const Datauri = require('datauri')

// replace these to match your site URL. Note: Use TLS, not plain HTTP, for your production site!
const domain = `${process.env.CLIENT_BUCKET_NAME}.s3-website-${process.env.AWS_DEFAULT_REGION}.amazonaws.com`
const baseUrl = `http://${domain}/`

const feedbackEnabled = !!process.env['FeedbackSnsTopicArn']

function getCognitoIdentityId(req) {
    return req.apiGateway.event.requestContext.identity.cognitoIdentityId
}

// strategy borrowed from: https://serverless-stack.com/chapters/mapping-cognito-identity-id-and-user-pool-id.html
function getCognitoUserId(req) {
    const authProvider = req.apiGateway.event.requestContext.identity.cognitoAuthenticationProvider;

    // Cognito authentication provider looks like:
    // cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxxxxx,cognito-idp.us-east-1.amazonaws.com/us-east-1_aaaaaaaaa:CognitoSignIn:qqqqqqqq-1111-2222-3333-rrrrrrrrrrrr
    // Where us-east-1_aaaaaaaaa is the User Pool id
    // And qqqqqqqq-1111-2222-3333-rrrrrrrrrrrr is the User Pool User Id
    const parts = authProvider.split(':'),
          userPoolIdParts = parts[parts.length - 3].split('/'),
          userPoolId = userPoolIdParts[userPoolIdParts.length - 1],
          userPoolUserId = parts[parts.length - 1]

    return userPoolUserId
}

// this returns the key we use in the CustomersTable. It's constructed from the issuer field and the username when we
// allow multiple identity providers, this will allow google's example@example.com to be distinguishable from
// Cognito's or Facebook's example@example.com
function getCognitoKey(req) {
    return req.apiGateway.event.requestContext.authorizer.claims.iss + ' ' + getCognitoUsername(req)
}

function getUsagePlanFromCatalog(usagePlanId) {
    return catalog()
        .then((catalog) => catalog.apiGateway.find(usagePlan => usagePlan.id === usagePlanId))
}

function postSignIn(req, res) {
    const cognitoIdentityId = getCognitoIdentityId(req)
    console.log(`POST /signin for Cognito ID: ${cognitoIdentityId}`)

    const cognitoUserId = getCognitoUserId(req)

    function errFunc(data) {
        console.log(`error: ${data}`)
        res.status(500).json(data)
    }

    // ensure an API Key exists for this customer and that the Cognito identity and API Key Id are tracked in DDB
    customersController.getApiKeyForCustomer(cognitoIdentityId, errFunc, (data) => {
        console.log(`Get Api Key data ${JSON.stringify(data)}`)

        if (data.items.length === 0) {
            console.log(`No API Key found for customer ${cognitoIdentityId}`)

            customersController.createApiKey(cognitoIdentityId, cognitoUserId, errFunc, (createData) => {
                console.log(`Create API Key data: ${JSON.stringify(createData, null, 4)}`)
                const keyId = createData.id

                console.log(`Got key ID ${keyId}`)

                customersController.ensureCustomerItem(cognitoIdentityId, cognitoUserId, keyId, errFunc)
                    .then(() => res.status(200).json({}))
            })
        } else {
            const keyId = data.items[0].id

            customersController.ensureCustomerItem(cognitoIdentityId, cognitoUserId, keyId, errFunc)
                .then(() => res.status(200).json({}))
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

    getUsagePlanFromCatalog(usagePlanId).then(async (catalogUsagePlan) => {
        const isUsagePlanInCatalog = Boolean(catalogUsagePlan)
        const apiGatewayUsagePlan = await exports.apigateway.getUsagePlan({ usagePlanId }).promise()

        function error(data) {
            console.log(`error: ${data}`)
            res.status(500).json(data)
        }

        function success(data) {
            res.status(201).json(data)
        }

        // the usage plan doesn't exist
        if (!isUsagePlanInCatalog) {
            res.status(404).json({ error: 'Invalid Usage Plan ID' })
        // the usage plan exists, but 0 of its apis are visible
        } else if(!catalogUsagePlan.apis.length) {
            res.status(404).json({ error: 'Invalid Usage Plan ID' })
        // allow subscription if (the usage plan exists, at least 1 of its apis are visible)
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

function findApiInCatalog(restApiId, stageName, catalog) {
    let foundApi = null

    // forEach here is inefficient; can't terminate early
    catalog.apiGateway.forEach((usagePlan) => {
        usagePlan.apis.forEach((api) => {
            if (api.id === restApiId && api.stage === stageName)
                foundApi = api
        })
    })

    Object.keys(catalog.generic).forEach((genericKey) => {
        let api = catalog.generic[genericKey]
        if(api.apiId === restApiId && api.stage === stageName)
            foundApi = api
    })

    return foundApi
}

async function getSdk(req, res) {
    console.log(`GET /catalog/${req.params.id}/sdk for Cognito ID: ${getCognitoIdentityId(req)}`)

    // note that we only return an SDK if the API is in the catalog
    // this is important because the lambda function has permission to fetch any API's SDK
    // we don't want to leak customer API shapes if they have privileged APIs not in the catalog
    let restApiId = req.params.id.split('_')[0],
        stageName = req.params.id.split('_')[1],
        catalogObject = findApiInCatalog(restApiId, stageName, await catalog())

    if(!catalogObject) {
        res.status(400).json({ message: `API with ID (${restApiId}) and Stage (${stageName}) could not be found.` })
    } else if(!catalogObject.sdkGeneration) {
        res.status(400).json({ message: `API with ID (${restApiId}) and Stage (${stageName}) is not enabled for SDK generation.` })
    } else {
        let parameters = req.query.parameters
        if (typeof parameters === 'string') {
            try { parameters = JSON.parse(parameters) } catch (e) {
                return res.status(400).json({ message: `Input parameters for API with ID (${restApiId}) and Stage (${stageName}) were a string, but not parsable JSON: ${parameters}` })
            }
        }
        console.log(req.query.parameters)
        console.log(parameters)
        let resultsBuffer = (await exports.apigateway.getSdk({
            restApiId,
            sdkType: req.query.sdkType,
            stageName,
            parameters
        }).promise()).body

        const datauri = new Datauri();
        datauri.format('.zip', resultsBuffer)

        res.send(datauri.content)
    }
}

async function getAdminCatalogVisibility(req, res) {
    console.log(`GET /admin/catalog/visibility for Cognito ID: ${getCognitoIdentityId(req)}`)
    try {

        let visibility = { apiGateway: [] },
            catalogObject = await catalog(),
            apis = (await exports.apigateway.getRestApis().promise()).items

        console.log(`network request: ${JSON.stringify(apis, null, 4)}`)
        console.log(`apis: ${JSON.stringify(apis, null, 4)}`)

        let promises = []
        apis.forEach((api) => {
            promises.push(
                exports.apigateway.getStages({ restApiId: api.id }).promise()
                    .then((response) => response.item)
                    .then((stages) => stages.forEach(stage => visibility.apiGateway.push({
                        id: api.id,
                        name: api.name,
                        stage: stage.stageName,
                        visibility: false
                    })))
            )
        })
        await Promise.all(promises)

        console.log(`visibility: ${JSON.stringify(visibility, null, 4)}`)

        // mark every api gateway managed api-stage in the catalog as visible
        catalogObject.apiGateway.forEach((usagePlan) => {
            usagePlan.apis.forEach((api) => {
                visibility.apiGateway.map((apiEntry) => {
                    if(apiEntry.id === api.id && apiEntry.stage === api.stage) {
                        apiEntry.visibility = true
                        apiEntry.sdkGeneration = api.sdkGeneration || false
                    }

                    return apiEntry
                })
            })
        })

        let usagePlans = await exports.apigateway.getUsagePlans().promise()

        // In the case of apiGateway APIs, the client doesn't know if there are usage plan associated or not
        // so we need to provide that information. This can't be merged with the above loop:
        // (catalogObject.apiGateway.forEach((usagePlan) => ...
        // because the catalog only contains *visible* apis, and this loop needs to record the subscribability
        // of both visible and non-visible APIs.
        visibility.apiGateway.map((apiEntry) => {
            apiEntry.subscribable = false

            usagePlans.items.forEach((usagePlan) => {
                usagePlan.apiStages.forEach((apiStage) => {
                    if(apiEntry.id === apiStage.apiId && apiEntry.stage === apiStage.stage) {
                        apiEntry.subscribable = true
                        apiEntry.usagePlanId = usagePlan.id
                        apiEntry.usagePlanName = usagePlan.name
                    }

                    apiEntry.sdkGeneration = !!apiEntry.sdkGeneration
                })
            })

            return apiEntry
        })

        // mark every api in the generic catalog as visible
        catalogObject.generic.forEach((catalogEntry) => {
            if(!visibility.generic) {
                visibility.generic = {}
            }

            visibility.generic[catalogEntry.id] = {
                visibility: true,
                name: (catalogEntry.swagger && catalogEntry.swagger.info && catalogEntry.swagger.info.title) || 'Untitled'
            }

            if(catalogEntry.stage)
                visibility.generic[catalogEntry.id].stage = catalogEntry.stage
            if(catalogEntry.apiId)
                visibility.generic[catalogEntry.id].apiId = catalogEntry.apiId
            if(catalogEntry.sdkGeneration !== undefined) {
                visibility.apiGateway.map((api) => {
                    console.log(api)
                    console.log(catalogEntry)
                    if(api.id === catalogEntry.apiId && api.stage === catalogEntry.stage) {
                        api.sdkGeneration = catalogEntry.sdkGeneration
                    }
                    return api
                })
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
                parameters: {
                    "extensions": "apigateway"
                }
            }).promise()

            console.log('swagger: ', swagger.body)
            console.log('subscribable: ', req.body.subscribable)
            
            let params
            if (req.body.subscribable === 'true' || req.body.subscribable === true) {
                params = {
                    Bucket: process.env.StaticBucketName,
                    Key: `catalog/${req.body.apiKey}.json`,
                    Body: swagger.body
                }
    
            } else if (req.body.subscribable === 'false') {
                params = {
                    Bucket: process.env.StaticBucketName,
                    Key: `catalog/unsubscribable_${req.body.apiKey.split('_')[0]}_${req.body.apiKey.split('_')[1]}.json`,
                    Body: swagger.body
                }
            }
            console.log('params: ', params)

            await exports.s3.upload(params).promise()

            res.status(200).json({ message: 'Success' })
        // }

    // for generic swagger, just provide the swagger body
    } else if(req.body && req.body.swagger) {
        try {
            const swaggerObject = JSON.parse(req.body.swagger)
            if(!(swaggerObject.info && swaggerObject.info.title)) {
                res.status(400).json({ message: 'Invalid input. API specification file must have a title.' })
            }

            console.log(`Given the input of type ${typeof swaggerObject}:`)
            console.log(JSON.stringify(swaggerObject, null, 4))
            console.log(`I produced the hash: ${hash(swaggerObject)}`)

            let params = {
                Bucket: process.env.StaticBucketName,
                Key: `catalog/${hash(swaggerObject)}.json`,
                Body: req.body.swagger
            }

            await exports.s3.upload(params).promise()

            res.status(200).json({ message: 'Success' })
        } catch(error) {
            console.error(error)
            res.status(400).json({ message: 'Invalid input' })
        }
    } else {
        res.status(400).json({ message: 'Invalid input' })
    }
}

async function deleteAdminCatalogVisibility(req, res) {
    console.log(`DELETE /admin/catalog/visibility for Cognito ID: ${getCognitoIdentityId(req)}`)
    const catalogObject = await catalog()

    // for apigateway managed APIs, provide "apiId_stageName"
    // in the apiKey field
    console.log('delete request params:', req.params)
    if(req.params && req.params.id) {
        let unsubscribable = true

        catalogObject.apiGateway.forEach((usagePlan) => {
            usagePlan.apis.forEach((api) => {
                if(api.id === req.params.id.split('_')[0] && api.stage === req.params.id.split('_')[1]) {
                    unsubscribable = false
                }
            })
        })

        let params = {
            Bucket: process.env.StaticBucketName,
            // assumed: apiId_stageName.json is the only format
            // no yaml, no autodetection based on file contents
            Key: `catalog/${unsubscribable ? 'unsubscribable_' : ''}${req.params.id}.json`
        }

        await exports.s3.deleteObject(params).promise()

        res.status(200).json({ message: 'Success' })

    // for generic swagger, provide the hashed swagger body
    // in the id field
    } else if(req.params && req.params.genericId) {
        let params = {
            Bucket: process.env.StaticBucketName,
            Key: `catalog/${ req.params.genericId }.json`
        }

        await exports.s3.deleteObject(params).promise()

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
    getSdk,
    getAdminCatalogVisibility,
    postAdminCatalogVisibility,
    deleteAdminCatalogVisibility,
    putAdminCatalogSdkGeneration,
    deleteAdminCatalogSdkGeneration,
    idempotentSdkGenerationUpdate,
    s3: new AWS.S3(),
    apigateway: new AWS.APIGateway(),
    lambda: new AWS.Lambda(),
    hash
}
