'use strict'

const hash = require('object-hash')
const { getAllUsagePlans } = require('dev-portal-common/get-all-usage-plans')
const util = require('../../../util')
const catalogUtil = require('../../../catalog-util')
const nodeUtil = require('util')

const inspect = o => JSON.stringify(o, null, 2)

// Let's try to minimize how many calls we make here.
const MAX_REST_API_LIMIT = 500

exports.get = async (event) => {
  console.log(`GET /admin/catalog/visibility for Cognito ID: ${util.getCognitoIdentityId(event)}`)
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
  const apiGatewayVisibility = (
    await Promise.all(apis.map(async (api) => {
      const response = await util.apigateway.getStages({ restApiId: api.id }).promise()
      return response.item.map(stage => ({
        id: api.id,
        name: api.name,
        stage: stage.stageName,
        visibility: false
      }))
    }))
  ).flat()

  await Promise.all(apis.map(async (api) => {
    const response = util.apigateway.getStages({ restApiId: api.id }).promise()
    response.item.forEach(stage => apiGatewayVisibility.push({
      id: api.id,
      name: api.name,
      stage: stage.stageName,
      visibility: false
    }))
  }))

  console.log(`apiGateway visibility: ${inspect(apiGatewayVisibility)}`)

  // mark every api gateway managed api-stage in the catalog as visible
  for (const usagePlan of catalogObject.apiGateway) {
    console.log(`usage plan: ${nodeUtil.inspect(usagePlan, null, 2)}`)
    for (const api of usagePlan.apis) {
      console.log(`usage plan api: ${nodeUtil.inspect(api, null, 1)}`)
      for (const apiEntry of apiGatewayVisibility) {
        if (apiEntry.id === api.apiId && apiEntry.stage === api.apiStage) {
          console.log(`matching apiEntry: ${inspect(apiEntry)}`)
          apiEntry.visibility = true
          apiEntry.sdkGeneration = api.sdkGeneration || false
        }
      }
    }
  }

  console.log(`apiGateway visibility updated visibility: ${inspect(apiGatewayVisibility)}`)

  const usagePlans = await getAllUsagePlans(util.apigateway)

  // In the case of apiGateway APIs, the client doesn't know if there are usage plan associated or not
  // so we need to provide that information. This can't be merged with the above loop:
  // (catalogObject.apiGateway.forEach((usagePlan) => ...
  // because the catalog only contains *visible* apis, and this loop needs to record the subscribability
  // of both visible and non-visible APIs.
  for (const apiEntry of apiGatewayVisibility) {
    apiEntry.subscribable = false

    for (const usagePlan of usagePlans) {
      for (const apiStage of usagePlan.apiStages) {
        if (apiEntry.id === apiStage.apiId && apiEntry.stage === apiStage.stage) {
          apiEntry.subscribable = true
          apiEntry.usagePlanId = usagePlan.id
          apiEntry.usagePlanName = usagePlan.name
        }

        apiEntry.sdkGeneration = !!apiEntry.sdkGeneration
      }
    }
  }

  console.log(`apiGateway visibility updated subscribable: ${inspect(apiGatewayVisibility)}`)

  let genericVisibility

  if (catalogObject.generic.length) {
    genericVisibility = {}

    // mark every api in the generic catalog as visible
    // eslint-disable-next-line no-labels
    catalogLoop:
    for (const catalogEntry of catalogObject.generic) {
      console.log(`catalogEntry: ${nodeUtil.inspect(catalogEntry, null, 1)}`)
      // Unlike in the catalog and elsewhere, the visibility's `apiGateway` contains *all* API
      // Gateway-managed APIs, and only unmanaged APIs are in `genericVisibility`.
      if (catalogEntry.apiId != null) {
        for (const api of apiGatewayVisibility) {
          if (api.id === catalogEntry.apiId && api.stage === catalogEntry.apiStage) {
            api.visibility = true

            if (catalogEntry.sdkGeneration !== undefined) {
              api.sdkGeneration = catalogEntry.sdkGeneration
            }

            // eslint-disable-next-line no-labels
            continue catalogLoop
          }
        }
      }

      genericVisibility[catalogEntry.id] = {
        visibility: true,
        name: (catalogEntry.swagger && catalogEntry.swagger.info && catalogEntry.swagger.info.title) || 'Untitled'
      }
    }

    console.log(`generic visibility: ${inspect(genericVisibility)}`)
  }

  return genericVisibility
    ? { apiGateway: apiGatewayVisibility, generic: genericVisibility }
    : { apiGateway: apiGatewayVisibility }
}

exports.post = async (event) => {
  console.log(`POST /admin/catalog/visibility for Cognito ID: ${util.getCognitoIdentityId(event)}`)

  const body = util.getBody(event)

  // for apigateway managed APIs, provide "apiId_stageName"
  // in the apiKey field
  if (body.apiKey) {
    const [restApiId, stageName] = body.apiKey.split('_')
    const swagger = await util.apigateway.getExport({
      restApiId,
      stageName,
      exportType: 'swagger',
      parameters: {
        extensions: 'apigateway'
      }
    }).promise()

    console.log('swagger: ', swagger.body)
    console.log('subscribable: ', body.subscribable)

    let file
    if (body.subscribable === 'true' || body.subscribable === true) {
      file = `catalog/${restApiId}_${stageName}.json`
    } else if (body.subscribable === 'false' || body.subscribable === false) {
      file = `catalog/unsubscribable_${restApiId}_${stageName}.json`
    } else {
      return util.abort(event, 400, 'Invalid input. Request body must have the `subscribable` key.')
    }

    await catalogUtil.uploadFile(file, swagger.body)

    return { message: 'Success' }

    // for generic swagger, just provide the swagger body
  } else if (body.swagger) {
    let swaggerObject
    try {
      swaggerObject = JSON.parse(body.swagger)
      if (!(swaggerObject.info && swaggerObject.info.title)) {
        return util.abort(event, 400, 'Invalid input. API specification file must have a title.')
      }
    } catch (error) {
      return util.abort(event, 400, `Invalid input. ${error.message}`)
    }

    await catalogUtil.uploadFile(`catalog/${hash(swaggerObject)}.json`, Buffer.from(body.swagger))

    return { message: 'Success' }
  } else {
    return util.abort(event, 400, 'Invalid input')
  }
}

exports.delete = async (event, id) => {
  console.log(`DELETE /admin/catalog/visibility for Cognito ID: ${util.getCognitoIdentityId(event)}`)

  // for apigateway managed APIs, provide "apiId_stageName"
  // in the apiKey field
  console.log('delete request params:', { id })
  if (!id.includes('_')) return util.abort(event, 400, 'Invalid input')
  console.log('managed api')

  // We assume it's JSON - users shouldn't be modifying this directly. However, we can't assume
  // it's still unsubscribable as if the API is attached to a usage plan, that ends up out of
  // sync with our catalog. In this case, we just try to delete both, as it's easier and faster
  // than checking whether it *is* subscribable.
  await catalogUtil.deleteFile(`catalog/unsubscribable_${id}.json`)
  await catalogUtil.deleteFile(`catalog/${id}.json`)
  return { message: 'Success' }
}
