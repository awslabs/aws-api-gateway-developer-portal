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

    await util.s3.upload(params).promise()

    res.status(200).json({ message: 'Success' })
    // }

    // for generic swagger, just provide the swagger body
  } else if (req.body && req.body.swagger) {
    try {
      const swaggerObject = JSON.parse(req.body.swagger)
      if (!(swaggerObject.info && swaggerObject.info.title)) {
        res.status(400).json({ message: 'Invalid input. API specification file must have a title.' })
      }

      console.log(`Given the input of type ${typeof swaggerObject}:`)
      console.log(JSON.stringify(swaggerObject, null, 4))
      console.log(`I produced the hash: ${hash(swaggerObject)}`)

      const params = {
        Bucket: process.env.StaticBucketName,
        Key: `catalog/${hash(swaggerObject)}.json`,
        Body: req.body.swagger
      }

      await util.s3.upload(params).promise()

      res.status(200).json({ message: 'Success' })
    } catch (error) {
      console.error(error)
      res.status(400).json({ message: 'Invalid input' })
    }
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

    const params = {
      Bucket: process.env.StaticBucketName,
      // assumed: apiId_stageName.json is the only format
      // no yaml, no autodetection based on file contents
      Key: `catalog/${unsubscribable ? 'unsubscribable_' : ''}${req.params.id}.json`
    }

    await util.s3.deleteObject(params).promise()

    res.status(200).json({ message: 'Success' })

    // for generic swagger, provide the hashed swagger body
    // in the id field
  } else if (req.params && req.params.genericId) {
    const params = {
      Bucket: process.env.StaticBucketName,
      Key: `catalog/${req.params.genericId}.json`
    }

    await util.s3.deleteObject(params).promise()

    res.status(200).json({ message: 'Success' })
  } else {
    res.status(400).json({ message: 'Invalid input' })
  }
}
