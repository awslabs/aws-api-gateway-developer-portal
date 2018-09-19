'use strict';

// TODO: This whole lambda may need to be 'debounced' in the future via SNS/SQS
// Right now it runs once per file, and thus may have nasty race conditions

let AWS = require('aws-sdk'),
  s3 = new AWS.S3(),
  gateway = new AWS.APIGateway(),
  _ = require('lodash'),
  bucketName = ''

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
  console.log(`file ${file.Key} is${isSwagger? '': ' not'} a swagger file and is${isInCatalogFolder? '': ' not'} in the correct folder.`)
  return isSwagger && isInCatalogFolder
}

function getSwaggerFile(file) {
  let params = {
    Bucket: bucketName,
    Key: file.Key
  }

  return s3.getObject(params).promise()
    .then((obj) => {
      console.log(`swaggerFile: ${JSON.stringify(obj)}`)
      return obj
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
 *   apis: [{
 *     id: 'YOUR_API_ID',
 *     image: '/sam-logo.png',
 *     swagger: petStoreSwaggerDefinition
 *   }]
 * }
 * @param {Object} usagePlan the API GW CS representation of a usage plan
 * @param {Array} swaggerFiles array of swagger file bodies retrieved from s3
 * @returns {Object} a 'catalog object' with id, name, and apis properties
 */
function usagePlanToCatalogObject(usagePlan, swaggerFiles) {
  let catalogObject = {
    id: usagePlan.id,
    name: usagePlan.name,
    apis: []
  }

  _.forEach(usagePlan.apiStages, (apiStage) => {
    let api = {}

    _.chain(swaggerFiles)
      .find((swaggerFile) => {
        console.log(`swaggerFile: ${swaggerFile}`)
        console.log(`apiId: ${apiStage.apiId}`)
        console.log(`swaggerFile.indexOf(apiStage.apiId): ${swaggerFile.indexOf(apiStage.apiId)}`)
        return swaggerFile.indexOf(apiStage.apiId) !== -1
      })
      .tap((swaggerFile) => {
        if(swaggerFile) {
          api.swagger = JSON.parse(swaggerFile)
          api.id = apiStage.apiId
          //TO-DO: Allow for customizing image?
          api.image = '/sam-logo.png'
          console.log(`api: ${JSON.stringify(api, null, 4)}`)
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

        console.log(`promises: ${JSON.stringify(promises)}`)
        return Promise.all(promises)
      })
      .then((swaggerFiles) => {
        console.log(`results: ${JSON.stringify(swaggerFiles, null, 4)}`)
        let catalogObjects = []

        swaggerFiles.forEach((file, index) => {
          swaggerFiles[index] = file.Body.toString()
          console.log(`swaggerFile #${index+1}: ${swaggerFiles[index].substring(0, 100)}`)
        })

        return gateway.getUsagePlans({}).promise()
          .then((result) => {
            console.log(`usagePlans: ${JSON.stringify(result.items, null, 4)}`)
            let usagePlans = result.items
            for (let i = 0; i < usagePlans.length; i++) {
              catalogObjects[i] = usagePlanToCatalogObject(usagePlans[i], swaggerFiles)
            }
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