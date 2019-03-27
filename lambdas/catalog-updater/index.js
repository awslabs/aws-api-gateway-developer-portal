// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

// TODO: This whole lambda may need to be 'debounced' in the future via SNS/SQS
// Right now it runs once per file, on every file, and thus may have nasty race conditions

let AWS = require('aws-sdk'),
  _ = require('lodash'),
  yaml = require('js-yaml'),
  bucketName = '',
  hash = require('object-hash')

/**
 * Takes in an s3 listObjectsV2 object and returns whether it's a "swagger file" (one ending in .JSON, .YAML, or .YML),
 * and whether it's in the catalog folder (S3 Key starts with "catalog/").
 *
 * In the future, this could be extended to look into the file for the swagger version declaration.
 *
 * @param {Object} file an s3 listObjectsV2 response object
 * @returns {boolean} whether or not the file is a swagger file (JSON/YAML)
 */
function swaggerFileFilter(file) {
  let extension = file.Key.split('/').pop().split('.').pop(),
    isSwagger = (extension === 'json' || extension === 'yaml' || extension === 'yml'),
    isInCatalogFolder = file.Key.startsWith('catalog/')
  console.log(`file ${file.Key} is${isSwagger ? '' : ' not'} a swagger file and is${isInCatalogFolder ? '' : ' not'} in the correct folder.`)
  return isSwagger && isInCatalogFolder
}


/**
 * Takes an s3 file representation and fetches the file's body, putting it into a new, internal file representation.
 *
 * Example internal file representation:
 * {
 *   body: '{ "swagger": 2.0, ... }',
 *   // note that apiStageKey may be undefined if we couldn't determine an exact apiStage!
 *   apiStageKey: 'a3d2ef_prod'
 *   // if the api is generic, it'll have these properties
 *   generic: true,
 *   id: 'somehugehash'
 * }
 *
 * @param file an s3 file representation
 * @returns {Promise.<Object>} a promise that resolves to an internal file representation
 */
function getSwaggerFile(file) {
  let params = {
    Bucket: bucketName,
    Key: file.Key
  },
  isApiStageKeyRegex = /^[a-zA-Z0-9]{10}_.*/,
  isUnsubscribableApiStageKeyRegex = /^unsubscribable_[a-zA-Z0-9]{10}_.*/

  return exports.s3.getObject(params).promise()
    .then((s3Repr) => {
      let result = {};

      console.log(`Processing file: ${file.Key}`)

      try {
        //s3Repr.Body is a buffer, so we call toString()
        result.body = JSON.parse(s3Repr.Body.toString());
      } catch (jsonErr) {
        try {
          result.body = yaml.safeLoad(s3Repr.Body.toString());
        } catch (yamlErr) {
          throw new Error(`Could not parse file ${file.Key}
          YAML parse error: ${yamlErr}
          JSON parse error: ${jsonErr}`)
        }
      }

      // if the file was saved with its name as an API_STAGE key, we should use that
      // from strings like catalog/a1b2c3d4e5_prod.json, remove catalog and .json
      // we can trust that there's not a period in the stage name, as API GW doesn't allow that
      if (file.Key.replace('catalog/', '').match(isApiStageKeyRegex)) {
        result.apiStageKey = file.Key.replace('catalog/', '').split('.')[0]
        console.log(`File ${file.Key} was saved with an API_STAGE name of ${result.apiStageKey}.`)
      }
      else if (file.Key.replace('catalog/', '').match(isUnsubscribableApiStageKeyRegex)) {
        result.apiId = file.Key.replace('catalog/unsubscribable_', '').split('.')[0].split('_')[0]
        result.stage = file.Key.replace('catalog/unsubscribable_', '').split('.')[0].split('_')[1]
        result.generic = true
        result.id = hash(result.body)
      }
      // if the file wasn't saved with its name as an API_STAGE key, assume it's a generic api
      else {
        console.log(`Generic Swagger definition found: ${file.Key}`)
        result.generic = true
        result.id = hash(result.body)
      }

      return result
    })
    .catch(/* istanbul ignore next */(error) => {
      console.log(`error retrieving swagger file ${file.Key}:\n`, error)
    })
}

/**
 *
 *
 * Example catalog object:
 * {
 *   id: 'YOUR_USAGE_PLAN_ID',
 *   name: 'Free',
 *   // throttle could be undefined
 *   throttle: {
 *      burstLimit: 5,
 *      rateLimit: 0.33
 *   },
 *   // quota could be undefined
 *   quota: {
 *      limit : 100,
 *      offset : 0,
 *      // "DAY", "WEEK", or "MONTH"
 *      period : "WEEK"
 *   },
 *   apis: [{
 *     id: 'YOUR_API_ID',
 *     stage: 'YOUR_STAGE_NAME',
 *     swagger: '{ "swagger": 2.0, ... }'
 *   }]
 * }
 * @param {Object} usagePlan the API GW CS representation of a usage plan
 * @param {Array} swaggerFileReprs array of swagger file representations, each with a body and path parameter
 * @returns {Object} a 'catalog object' with id, name, and apis properties
 */
function usagePlanToCatalogObject(usagePlan, swaggerFileReprs, sdkGeneration) {
  let catalogObject = {
    id: usagePlan.id,
    name: usagePlan.name,
    throttle: usagePlan.throttle,
    quota: usagePlan.quota,
    apis: []
  }

  _.forEach(usagePlan.apiStages, (apiStage) => {
    let api = {}

    swaggerFileReprs
      .filter(swaggerFileRepr => swaggerFileRepr.apiStageKey === `${apiStage.apiId}_${apiStage.stage}`)
      .forEach(swaggerFileRepr => {
        api.swagger = exports.copyAnyMethod(swaggerFileRepr.body)
        api.id = apiStage.apiId
        api.stage = apiStage.stage
        console.log(`This api gateway managed API has a key of ${api.id}_${api.stage} and might be in sdkGeneration: ${sdkGeneration[`${api.id}_${api.stage}`]}`)
        console.log(sdkGeneration)
        sdkGeneration[`${api.id}_${api.stage}`] ? api.sdkGeneration = true : api.sdkGeneration = false
        catalogObject.apis.push(api)
      })
  })

  return catalogObject
}

function copyAnyMethod(api) {
  let apiPaths = _.get(api, 'paths', [])
  let anyKey = "x-amazon-apigateway-any-method"
  let methodsToAdd = ["get", "post", "put", "delete", "patch", "head", "options"]

  Object.keys(apiPaths).forEach(pathKey => {
    let path = apiPaths[pathKey]
    if (path[anyKey]) {
      methodsToAdd.forEach(method => {
        if (!path[method]) path[method] = _.cloneDeep(path[anyKey])
      })

      delete path[anyKey]
    }
  })

  return api
}

function buildCatalog(swaggerFiles, sdkGeneration) {
  console.log(`results: ${JSON.stringify(swaggerFiles, null, 4)}`)
  console.log(sdkGeneration)

  let catalog = {
    apiGateway: [],
    generic: []
  }

  return exports.gateway.getUsagePlans({}).promise()
    .then((result) => {
      console.log(`usagePlans: ${JSON.stringify(result.items, null, 4)}`)
      let usagePlans = result.items
      for (let i = 0; i < usagePlans.length; i++) {
          catalog.apiGateway[i] = usagePlanToCatalogObject(usagePlans[i], swaggerFiles, sdkGeneration)
      }

        catalog.generic.push(
        ...swaggerFiles.filter(s => s.generic).map(s => {
          s.swagger = s.body
          delete s.body
          console.log(`This generic API has an id of ${s.id} and sdkGeneration[s.id] === ${sdkGeneration[s.id]}`)

          s.sdkGeneration = !!sdkGeneration[s.id]
          if(!s.sdkGeneration) {
              s.sdkGeneration = !!sdkGeneration[`${s.apiId}_${s.stage}`]
          }
          return s
        })
      )

      console.log(`catalog: ${JSON.stringify(catalog, null, 4)}`)

      return catalog
    })
    .catch(/* istanbul ignore next */(error) => {
      console.log('error getting usage plans:', error)
    })
}

async function handler(event, context) {
    console.log(`event: ${JSON.stringify(event, null, 4)}`)
    bucketName = process.env.BucketName

    let sdkGeneration = JSON.parse((await exports.s3.getObject({ Bucket: bucketName, Key: 'sdkGeneration.json' }).promise())
                        .Body.toString())
    console.log(sdkGeneration)

    let listObjectsResult = await exports.s3.listObjectsV2({ Bucket: bucketName }).promise(),
        catalog = await exports.buildCatalog(await Promise.all(listObjectsResult.Contents
                         .filter(exports.swaggerFileFilter)
                         .map(exports.getSwaggerFile)), sdkGeneration)

    let params = {
      Bucket: bucketName,
      Key: 'catalog.json',
      Body: JSON.stringify(catalog),
      ContentType: 'application/json'
    }

    await exports.s3.upload(params).promise()
}

// make available for unit testing
// see: https://stackoverflow.com/questions/45111198/how-to-mock-functions-in-the-same-module-using-jest
// and also: https://luetkemj.github.io/170421/mocking-modules-in-jest/
exports = module.exports = {
  swaggerFileFilter,
  getSwaggerFile,
  buildCatalog,
  usagePlanToCatalogObject,
  copyAnyMethod,
  s3: new AWS.S3(),
  gateway: new AWS.APIGateway(),
  handler,
  hash
}