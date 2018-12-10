// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

// TODO: This whole lambda may need to be 'debounced' in the future via SNS/SQS
// Right now it runs once per file, on every file, and thus may have nasty race conditions

let AWS = require('aws-sdk'),
  _ = require('lodash'),
  yaml = require('js-yaml'),
  bucketName = ''


// See: https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
  let hash = 5381,
    i = str.length;

  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  return hash >>> 0;
}

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
    extractApiIdRegex = /(https?:\/\/)?(.*)\.execute-api\./,
    extractStageRegex = /\/?([^"]*)/

  return exports.s3.getObject(params).promise()
    .then((s3Repr) => {
      let result = {};

      console.log(`Processing file: ${file.Key}`)

      try {
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

      let swagger = {
        host:  _.get(result, 'body.host', '').match(extractApiIdRegex),
        basePath: _.get(result, 'body.basePath', '').match(extractStageRegex)
      }

      let oas = {
        host: _.get(result, 'body.servers[0].url', '').match(extractApiIdRegex),
        basePath: _.get(result, 'body.servers[0].variables.basePath.default', '').match(extractStageRegex)
      }

      // if the file was saved with its name as an API_STAGE key, we should use that
      // from strings like catalog/a1b2c3d4e5_prod.json, remove catalog and .json
      // we can trust that there's not a period in the stage name, as API GW doesn't allow that
      if (file.Key.replace('catalog/', '').match(isApiStageKeyRegex)) {
        result.apiStageKey = file.Key.replace('catalog/', '').split('.')[0]
        console.log(`File ${file.Key} was saved with an API_STAGE name of ${result.apiStageKey}.`)
      }
      // for Swagger 2, the api ID might be in the body.host field,
      // and the stage might be in the body.basePath field
      else if (swagger.host && swagger.basePath) {
        let apiId, stage;

        apiId = swagger.host.pop()
        stage = swagger.basePath.pop()
        result.apiStageKey = `${apiId}_${stage}`
        console.log(`File ${file.Key} has an identifying API_STAGE host of ${result.apiStageKey}.`)
      }
      // for OAS 3, the api ID might be in the body.servers[0].url field,
      // and the stage might be in the body.servers[0].variables.basePath.default field
      else if (oas.host && oas.basePath) {
        let apiId, stage;

        apiId = oas.host.pop()
        stage = oas.basePath.pop()
        result.apiStageKey = `${apiId}_${stage}`
        console.log(`File ${file.Key} has an identifying API_STAGE host of ${result.apiStageKey}.`)
      }
      // if none of the above checks worked, assume it's a generic api
      else {
        console.log(`Generic Swagger definition found: ${file.Key}`)
        result.generic = true
        result.id = hash(file.Key)
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
function usagePlanToCatalogObject(usagePlan, swaggerFileReprs) {
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

function buildCatalog(swaggerFiles) {
  console.log(`results: ${JSON.stringify(swaggerFiles, null, 4)}`)

  let catalog = {
    apiGateway: [],
    generic: []
  }

  return exports.gateway.getUsagePlans({}).promise()
    .then((result) => {
      console.log(`usagePlans: ${JSON.stringify(result.items, null, 4)}`)
      let usagePlans = result.items
      for (let i = 0; i < usagePlans.length; i++) {
          catalog.apiGateway[i] = usagePlanToCatalogObject(usagePlans[i], swaggerFiles)
      }

        catalog.generic.push(
        ...swaggerFiles.filter(s => s.generic).map(s => {
          s.swagger = s.body
          delete s.body
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

function handler(event, context) {
    console.log(`event: ${JSON.stringify(event, null, 4)}`)
    // this is really fragile
    bucketName = _.get(event, 'Records[0].s3.bucket.name')
    let params = { Bucket: bucketName }

    return exports.s3.listObjectsV2(params).promise()
      .then((result) => {
        console.log(`result: ${JSON.stringify(result, null, 4)}`)
        let promises = result.Contents
          .filter(exports.swaggerFileFilter)
          .map(exports.getSwaggerFile)

        return Promise.all(promises)
      })
      .then(exports.buildCatalog)
      .then((catalogObjects) => {
        let params = {
          Bucket: bucketName,
          Key: 'catalog.json',
          Body: JSON.stringify(catalogObjects),
          ContentType: 'application/json'
        },
        options = {}

        return exports.s3.upload(params, options).promise()
          .then((response) => console.log(`s3 upload succeeded: ${JSON.stringify(response, null, 4)}`))
          .catch(/* istanbul ignore next */(error) => console.log('error uploading catalog to s3:', error))
      })
      .catch(/* istanbul ignore next */(error) => {
        console.log(`error operating on bucket ${bucketName}:`, error)
      })
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