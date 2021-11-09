'use strict'

const hash = require('object-hash')
const { getAllUsagePlans } = require('dev-portal-common/get-all-usage-plans')
const util = require('../../../util')
const nodeUtil = require('util')

const inspect = o => JSON.stringify(o, null, 2)

// Let's try to minimize how many calls we make here.
const MAX_REST_API_LIMIT = 500

exports.get = async (req, res) => {
  console.log(`GET /admin/catalog/visibility for Cognito ID: ${util.getCognitoIdentityId(req)}`)
  try {
    const visibility = { apiGateway: [] }
    const catalogObject = await util.catalog()
    let restApiResult = await util.apigateway.getRestApis({
      limit: MAX_REST_API_LIMIT
    }).promise()
    const apis = restApiResult.items

    while (restApiResult.position != null) {
      restApiResult = await util.apigateway.getRestApis({
        limit: MAX_REST_API_LIMIT,
        position: restApiResult.position
      }).promise()
      for (const api of restApiResult.apis) apis.push(api)
    }

    console.log(`apis: ${inspect(apis)}`)

    const promises = []
    apis.forEach((api) => {
      promises.push(
        util.apigateway.getStages({ restApiId: api.id }).promise()
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

    console.log(`visibility initial: ${inspect(visibility)}`)

    // mark every api gateway managed api-stage in the catalog as visible
    catalogObject.apiGateway.forEach((usagePlan) => {
      console.log(`usage plan: ${nodeUtil.inspect(usagePlan, null, 2)}`)
      usagePlan.apis.forEach((api) => {
        console.log(`usage plan api: ${nodeUtil.inspect(api, null, 1)}`)
        visibility.apiGateway.map((apiEntry) => {
          if (apiEntry.id === api.apiId && apiEntry.stage === api.apiStage) {
            console.log(`matching apiEntry: ${inspect(apiEntry)}`)
            apiEntry.visibility = true
            apiEntry.sdkGeneration = api.sdkGeneration || false
          }

          return apiEntry
        })
      })
    })

    console.log(`visibility updated visibility: ${inspect(visibility)}`)

    const usagePlans = await getAllUsagePlans(util.apigateway)

    // In the case of apiGateway APIs, the client doesn't know if there are usage plan associated or not
    // so we need to provide that information. This can't be merged with the above loop:
    // (catalogObject.apiGateway.forEach((usagePlan) => ...
    // because the catalog only contains *visible* apis, and this loop needs to record the subscribability
    // of both visible and non-visible APIs.
    visibility.apiGateway.map((apiEntry) => {
      apiEntry.subscribable = false

      usagePlans.forEach((usagePlan) => {
        usagePlan.apiStages.forEach((apiStage) => {
          if (apiEntry.id === apiStage.apiId && apiEntry.stage === apiStage.stage) {
            apiEntry.subscribable = true
            apiEntry.usagePlanId = usagePlan.id
            apiEntry.usagePlanName = usagePlan.name
          }

          apiEntry.sdkGeneration = !!apiEntry.sdkGeneration
        })
      })

      return apiEntry
    })

    console.log(`visibility updated subscribable: ${inspect(visibility)}`)

    // mark every api in the generic catalog as visible
    catalogObject.generic.forEach((catalogEntry) => {
      console.log(`catalogEntry: ${nodeUtil.inspect(catalogEntry, null, 1)}`)
      // Unlike in the catalog and elsewhere, the visibility's `apiGateway` contains *all* API
      // Gateway-managed APIs, and only unmanaged APIs are in `visibility.generic`.
      if (catalogEntry.apiId != null) {
        const target = visibility.apiGateway.find((api) =>
          api.id === catalogEntry.apiId && api.stage === catalogEntry.apiStage
        )
        if (target != null) {
          target.visibility = true

          if (catalogEntry.sdkGeneration !== undefined) {
            target.sdkGeneration = catalogEntry.sdkGeneration
          }

          return
        }
      }

      if (!visibility.generic) {
        visibility.generic = {}
      }

      visibility.generic[catalogEntry.id] = {
        visibility: true,
        name: (catalogEntry.swagger && catalogEntry.swagger.info && catalogEntry.swagger.info.title) || 'Untitled'
      }
    })

    console.log(`visibility updated generic: ${inspect(visibility)}`)

    res.status(200).json(visibility)
  } catch (err) {
    console.error(`error: ${err.stack}`)

    // TODO: Should this be 'error' or 'message'?
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

// TODO: switch to SQS with a pair of queues (input with files, output with notifications) and just
// use that instead for detecting S3 changes.
async function catalogUpdate () {
  console.log('awaiting catalog update')

  // This will end up invoked twice, but I'd like to be able to track how long it takes to
  // update. Ideally, I would also prevent executing the lambda from the S3 side as well, but
  // that's not as easy as it sounds.
  await util.lambda.invoke({
    FunctionName: process.env.CatalogUpdaterFunctionArn,
    // this API would be more performant if we moved to 'Event' invocations, but then we couldn't signal to
    // admins when the catalog updater failed to update the catalog; they'd see a 200 and then no change in
    // behavior.
    InvocationType: 'RequestResponse',
    LogType: 'None'
  }).promise()
}

async function uploadFile (file, body) {
  console.log('upload bucket: ', process.env.StaticBucketName)
  console.log('upload key: ', file)
  console.log('upload body length: ', body.byteLength)
  await util.s3.upload({ Bucket: process.env.StaticBucketName, Key: file, Body: body, ExpectedBucketOwner: process.env.SourceAccount }).promise()
  await catalogUpdate()
}

async function deleteFile (file) {
  console.log('remove bucket: ', process.env.StaticBucketName)
  console.log('remove key: ', file)
  await util.s3.deleteObject({ Bucket: process.env.StaticBucketName, Key: file, ExpectedBucketOwner: process.env.SourceAccount }).promise()
  await catalogUpdate()
}

exports.post = async (req, res) => {
  console.log(`POST /admin/catalog/visibility for Cognito ID: ${util.getCognitoIdentityId(req)}`)

  // for apigateway managed APIs, provide "apiId_stageName"
  // in the apiKey field
  if (req.body && req.body.apiKey) {
    // try {
    const [restApiId, stageName] = req.body.apiKey.split('_')
    const swagger = await util.apigateway.getExport({
      restApiId,
      stageName,
      exportType: 'swagger',
      parameters: {
        extensions: 'apigateway'
      }
    }).promise()

    console.log('swagger: ', swagger.body)
    console.log('subscribable: ', req.body.subscribable)

    let file
    if (req.body.subscribable === 'true' || req.body.subscribable === true) {
      file = `catalog/${restApiId}_${stageName}.json`
    } else if (req.body.subscribable === 'false' || req.body.subscribable === false) {
      file = `catalog/unsubscribable_${restApiId}_${stageName}.json`
    } else {
      res.status(400).json({ message: 'Invalid input. Request body must have the `subscribable` key.' })
      return
    }

    await uploadFile(file, swagger.body)

    res.status(200).json({ message: 'Success' })
    // }

    // for generic swagger, just provide the swagger body
  } else if (req.body && req.body.swagger) {
    let swaggerObject
    try {
      swaggerObject = JSON.parse(req.body.swagger)
      if (!(swaggerObject.info && swaggerObject.info.title)) {
        res.status(400).json({ message: 'Invalid input. API specification file must have a title.' })
        return
      }
    } catch (error) {
      res.status(400).json({ message: `Invalid input. ${error.message}` })
      return
    }

    await uploadFile(`catalog/${hash(swaggerObject)}.json`, Buffer.from(req.body.swagger))

    res.status(200).json({ message: 'Success' })
  } else {
    res.status(400).json({ message: 'Invalid input' })
  }
}

exports.delete = async (req, res) => {
  console.log(`DELETE /admin/catalog/visibility for Cognito ID: ${util.getCognitoIdentityId(req)}`)

  // for apigateway managed APIs, provide "apiId_stageName"
  // in the apiKey field
  console.log('delete request params:', req.params)
  if (req.params && req.params.id) {
    if (!req.params.id.includes('_')) {
      res.status(400).json({ message: 'Invalid input' })
      return
    }

    console.log('managed api')

    // We assume it's JSON - users shouldn't be modifying this directly. However, we can't assume
    // it's still unsubscribable as if the API is attached to a usage plan, that ends up out of
    // sync with our catalog. In this case, we just try to delete both, as it's easier and faster
    // than checking whether it *is* subscribable.
    await deleteFile(`catalog/unsubscribable_${req.params.id}.json`)
    await deleteFile(`catalog/${req.params.id}.json`)
    res.status(200).json({ message: 'Success' })

    // for generic swagger, provide the hashed swagger body
    // in the id field
  } else if (req.params && req.params.genericId) {
    console.log('generic api')
    await deleteFile(`catalog/${req.params.genericId}.json`)
    res.status(200).json({ message: 'Success' })
  } else {
    res.status(400).json({ message: 'Invalid input' })
  }
}
