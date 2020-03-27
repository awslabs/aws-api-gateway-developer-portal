'use strict'

const hash = require('object-hash')
const { getAllUsagePlans } = require('dev-portal-common/get-all-usage-plans')
const util = require('../../../util')

exports.get = async (req, res) => {
  console.log(`GET /admin/catalog/visibility for Cognito ID: ${util.getCognitoIdentityId(req)}`)
  try {
    const visibility = { apiGateway: [] }
    const catalogObject = await util.catalog()
    const apis = (await util.apigateway.getRestApis().promise()).items

    console.log(`network request: ${JSON.stringify(apis, null, 4)}`)
    console.log(`apis: ${JSON.stringify(apis, null, 4)}`)

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

    console.log(`visibility: ${JSON.stringify(visibility, null, 4)}`)

    // mark every api gateway managed api-stage in the catalog as visible
    catalogObject.apiGateway.forEach((usagePlan) => {
      usagePlan.apis.forEach((api) => {
        visibility.apiGateway.map((apiEntry) => {
          if (apiEntry.id === api.id && apiEntry.stage === api.stage) {
            apiEntry.visibility = true
            apiEntry.sdkGeneration = api.sdkGeneration || false
          }

          return apiEntry
        })
      })
    })

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

    // mark every api in the generic catalog as visible
    catalogObject.generic.forEach((catalogEntry) => {
      if (!visibility.generic) {
        visibility.generic = {}
      }

      visibility.generic[catalogEntry.id] = {
        visibility: true,
        name: (catalogEntry.swagger && catalogEntry.swagger.info && catalogEntry.swagger.info.title) || 'Untitled'
      }

      if (catalogEntry.stage) { visibility.generic[catalogEntry.id].stage = catalogEntry.stage }
      if (catalogEntry.apiId) { visibility.generic[catalogEntry.id].apiId = catalogEntry.apiId }
      if (catalogEntry.sdkGeneration !== undefined) {
        visibility.apiGateway.map((api) => {
          console.log(api)
          console.log(catalogEntry)
          if (api.id === catalogEntry.apiId && api.stage === catalogEntry.stage) {
            api.sdkGeneration = catalogEntry.sdkGeneration
          }
          return api
        })
      }
    })

    res.status(200).json(visibility)
  } catch (err) {
    console.error(`error: ${err.stack}`)

    // TODO: Should this be 'error' or 'message'?
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

// TODO: switch to SQS with a pair of queues (input with files, output with notifications) and just
// use that instead for detecting S3 changes.
async function awaitChange () {
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
  await util.s3.upload({ Bucket: process.env.StaticBucketName, Key: file, Body: body }).promise()
  await awaitChange()
}

async function deleteFile (file) {
  console.log('remove bucket: ', process.env.StaticBucketName)
  console.log('remove key: ', file)
  await util.s3.deleteObject({ Bucket: process.env.StaticBucketName, Key: file }).promise()
  await awaitChange()
}

exports.post = async (req, res) => {
  console.log(`POST /admin-catalog-visibility for Cognito ID: ${util.getCognitoIdentityId(req)}`)

  // for apigateway managed APIs, provide "apiId_stageName"
  // in the apiKey field
  if (req.body && req.body.apiKey) {
    // try {
    const swagger = await util.apigateway.getExport({
      restApiId: req.body.apiKey.split('_')[0],
      stageName: req.body.apiKey.split('_')[1],
      exportType: 'swagger',
      parameters: {
        extensions: 'apigateway'
      }
    }).promise()

    console.log('swagger: ', swagger.body)
    console.log('subscribable: ', req.body.subscribable)

    let file
    if (req.body.subscribable === 'true' || req.body.subscribable === true) {
      file = `catalog/${req.body.apiKey}.json`
    } else if (req.body.subscribable === 'false') {
      file = `catalog/unsubscribable_${req.body.apiKey.split('_')[0]}_${req.body.apiKey.split('_')[1]}.json`
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
  const catalogObject = await util.catalog()

  // for apigateway managed APIs, provide "apiId_stageName"
  // in the apiKey field
  console.log('delete request params:', req.params)
  if (req.params && req.params.id) {
    const [id, stage] = req.params.id.split('_')
    const unsubscribable = !catalogObject.apiGateway.some(usagePlan =>
      usagePlan.apis.some(api => api.id === id && api.stage === stage)
    )

    // assumed: apiId_stageName.json is the only format
    // no yaml, no autodetection based on file contents
    await deleteFile(`catalog/${unsubscribable ? 'unsubscribable_' : ''}${req.params.id}.json`)
    res.status(200).json({ message: 'Success' })

    // for generic swagger, provide the hashed swagger body
    // in the id field
  } else if (req.params && req.params.genericId) {
    await deleteFile(`catalog/${req.params.genericId}.json`)
    res.status(200).json({ message: 'Success' })
  } else {
    res.status(400).json({ message: 'Invalid input' })
  }
}
