// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

// TODO: This whole lambda may need to be 'debounced' in the future via SNS/SQS
// Right now it runs once per file, on every file, and thus may have nasty race conditions

let AWS = require('aws-sdk'),
  s3 = new AWS.S3(),
  gateway = new AWS.APIGateway(),
  _ = require('lodash'),
  yaml = require('js-yaml'),
  bucketName = ''


// See: https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
  var hash = 5381,
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
 * Takes an s3 file representation and fetches the file's body, putting into a new, internal file representation.
 *
 * Example internal file representation:
 * {
 *   body: '{ "swagger": 2.0, ... }',
 *   // note that apiStageKey may be undefined if we couldn't determine an exact apiStage!
 *   apiStageKey: 'a3d2ef:prod'
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


  return s3.getObject(params).promise()
    .then((s3Repr) => {
      let result = {};

      console.log(`Processing file ${file.Key}:`)

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

      // Convert the paths property of the Swagger file to a string and check
      // if the paths have a method with a property containing "x-amazon-apigateway-integration".
      // If not, it is considered a generic API
      const isGenericApi = !JSON.stringify(result.body.paths).includes("x-amazon-apigateway-integration")

      if (isGenericApi) {
        console.log(`Generic Swagger definition found: ${file.Key}`)
        result.generic = true
        result.id = hash(file.Key)
      }
      // if the file was saved with its name as an API_STAGE key, we should use that
      // from strings like catalog/a1b2c3d4e5:prod.json, remove catalog and .json
      // we can trust that there's not a period in the stage name, as API GW doesn't allow that
      else if (file.Key.split('catalog/').pop().match(isApiStageKeyRegex)) {
        result.apiStageKey = file.Key.split('catalog/').pop().split('.')[0]
        console.log(`File ${file.Key} was saved with an API_STAGE name of ${result.apiStageKey}.`)
      }
      // for Swagger 2, the api ID might be in the body.host field,
      // and the stage might be in the body.basePath field
      else if (result.body.host && result.body.basePath) {
        let apiId, stage;

        apiId = result.body.host.match(extractApiIdRegex).pop()
        stage = result.body.basePath.match(extractStageRegex).pop()
        result.apiStageKey = `${apiId}_${stage}`
        console.log(`File ${file.Key} has an identifying API_STAGE host of ${result.apiStageKey}.`)
      }
      // for OAS 3, the api ID might be in the body.servers[0].url field,
      // and the stage might be in the body.servers[0].variables.basePath.default field
      else if (result.body.servers[0].url && result.body.servers[0].variables.basePath.default) {
        let apiId, stage;

        apiId = result.body.servers[0].url.match(extractApiIdRegex).pop()
        stage = result.body.servers[0].variables.basePath.default.match(extractStageRegex).pop()
        result.apiStageKey = `${apiId}_${stage}`
        console.log(`File ${file.Key} has an identifying API_STAGE host of ${result.apiStageKey}.`)
      }

      return result
    })
    .catch((error) => {
      console.log(`error retrieving swagger file ${file.Key}: ${error}`)
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
 *     stage: 'YOUR_STAGE_NAME'
 *     image: '/sam-logo.png',
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

    _.chain(swaggerFileReprs)
      .find((swaggerFileRepr) => {
        return swaggerFileRepr.apiStageKey === `${apiStage.apiId}_${apiStage.stage}`
      })
      .tap((swaggerFileRepr) => {
        if (swaggerFileRepr) {
          api.swagger = swaggerFileRepr.body
          api.id = apiStage.apiId
          api.stage = apiStage.stage
          //TODO: Allow for customizing image?
          api.image = '/sam-logo.png'
          catalogObject.apis.push(api)
        }
      })
      .value()
  })

  return catalogObject
}

exports.handler = (event, context) => {
  try {
    console.log(`event: ${JSON.stringify(event, null, 4)}`)
    // this is really fragile
    bucketName = _.get(event, 'Records[0].s3.bucket.name')
    let params = {
      Bucket: bucketName
    },
      promises = []

    return s3.listObjectsV2(params).promise()
      .then((result) => {
        console.log(`result: ${JSON.stringify(result, null, 4)}`)
        let promises =
          _
            .chain(result.Contents)
            .filter(swaggerFileFilter)
            .map(getSwaggerFile)
            .value()

        return Promise.all(promises)
      })
      .then((swaggerFiles) => {
        console.log(`results: ${JSON.stringify(swaggerFiles, null, 4)}`)
        let catalogObjects = {
          apiGateway: [],
          generic: []
        }

        return gateway.getUsagePlans({}).promise()
          .then((result) => {
            console.log(`usagePlans: ${JSON.stringify(result.items, null, 4)}`)
            let usagePlans = result.items
            for (let i = 0; i < usagePlans.length; i++) {
              catalogObjects.apiGateway[i] = usagePlanToCatalogObject(
                usagePlans[i], swaggerFiles.filter(s => !s.generic))
            }

            catalogObjects.generic.push(
              ...swaggerFiles.filter(s => s.generic).map(s => {
                //TODO: Allow for customizing image?
                s.image = '/sam-logo.png'
                s.swagger = s.body
                delete s.body
                return s
              })
            )

            console.log(`catalogObjects: ${JSON.stringify(catalogObjects, null, 4)}`)

            return catalogObjects
          })
          .catch((error) => console.log(`error getting usage plans: ${error}`))

      })
      .then((catalogObjects) => {
        let params = {
          Bucket: bucketName,
          Key: 'catalog.json',
          Body: JSON.stringify(catalogObjects),
          ContentType: 'application/json'
        },
          options = {}
        return s3.upload(params, options).promise()
          .then((response) => console.log(`s3 upload succeeded: ${JSON.stringify(response, null, 4)}`))
          .catch((error) => console.log(`error uploading catalog to s3: ${error}`))
      })
      .catch((error) => {
        console.log(`error operating on bucket ${bucketName}: ${error}`)
      })
  } catch (error) {
    console.log(`Caught top-level error: ${error}`)
  }
}