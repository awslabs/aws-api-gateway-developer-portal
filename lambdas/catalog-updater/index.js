// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict'

// TODO: This whole lambda may need to be 'debounced' in the future via SNS/SQS
// Right now it runs once per file, on every file, and thus may have nasty race conditions

const AWS = require('aws-sdk')
const yaml = require('js-yaml')
const hash = require('object-hash')
const path = require('path')
const util = require('util')

const { getAllUsagePlans } = require('dev-portal-common/get-all-usage-plans')
const inspect = value => util.inspect(value, { depth: Infinity, breakLength: Infinity })

/**
 * Takes in an s3 listObjectsV2 object and returns whether it's a "swagger file" (one ending in .JSON, .YAML, or .YML),
 * and whether it's in the catalog folder (S3 Key starts with "catalog/").
 *
 * In the future, this could be extended to look into the file for the swagger version declaration.
 *
 * @param {Object} file an s3 listObjectsV2 response object
 * @returns {boolean} whether or not the file is a swagger file (JSON/YAML)
 */
function swaggerFileFilter (file) {
  const isSwagger = /^\.(?:json|yaml|yml)$/.test(path.extname(file.Key))
  console.log(
    isSwagger ? `file ${file.Key} is a swagger file.` : `file ${file.Key} is not a swagger file.`
  )
  return isSwagger
}

/**
 * Takes an s3 file representation and fetches the file's body, putting it into a new, internal
 * file representation.
 *
 * Example internal file representation:
 * {
 *   body: '{ "swagger": 2.0, ... }',
 *   // note that these two may be undefined if we couldn't determine an exact apiStage!
 *   apiId: 'a3d2ef'
 *   apiStage: 'prod'
 *   // if the api is generic, it'll have these properties
 *   generic: true,
 *   id: 'somehugehash'
 * }
 *
 * @param file an s3 file representation
 * @returns {Promise<Object>} a promise that resolves to an internal file representation
 */
async function getSwaggerFile (file) {
  const s3Repr = await exports.s3.getObject({
    Bucket: process.env.BucketName,
    Key: file.Key
  }).promise()

  console.log(`Processing file: ${file.Key}`)
  let body

  try {
    // s3Repr.Body is a buffer, so we call toString()
    body = JSON.parse(s3Repr.Body.toString())
  } catch (jsonErr) {
    try {
      body = yaml.safeLoad(s3Repr.Body.toString())
    } catch (yamlErr) {
      throw new Error(`Could not parse file ${file.Key}
          YAML parse error: ${yamlErr}
          JSON parse error: ${jsonErr}`)
    }
  }
  const id = hash(body)
  let apiId, apiStage

  // if the file was saved with its name as an API_STAGE key, we should use that
  // from strings like catalog/a1b2c3d4e5_prod.json, remove catalog and .json
  // we can trust that there's not a period in the stage name, as API GW doesn't allow that
  const match = /^catalog\/(?:unsubscribable_)?([a-zA-Z0-9]{10})_(.*)\.json$/.exec(file.Key)
  const generic = match == null
  if (generic) {
    // if the file wasn't saved with its name as an API_STAGE key, assume it's a generic api
    console.log(`Generic Swagger definition found: ${file.Key}`)
  } else {
    [, apiId, apiStage] = match
    if (file.Key.startsWith('catalog/unsubscribable_')) {
      console.log(`Unsubscribable API found: ${file.Key}.`)
    } else {
      console.log(`Subscribable API found: ${file.Key}.`)
    }
  }

  return { id, body, apiId, apiStage, generic }
}

function copyAnyMethod (api) {
  Object.values(api.paths).forEach(path => {
    const anyPath = path['x-amazon-apigateway-any-method']
    if (anyPath != null) {
      delete path['x-amazon-apigateway-any-method']
      if (!('get' in path)) path.get = anyPath
      if (!('post' in path)) path.post = anyPath
      if (!('put' in path)) path.put = anyPath
      if (!('delete' in path)) path.delete = anyPath
      if (!('patch' in path)) path.patch = anyPath
      if (!('head' in path)) path.head = anyPath
      if (!('options' in path)) path.options = anyPath
    }
  })
}

class CatalogBuilder {
  /**
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
   * @param {Object[]} usagePlans an array with the API GW CS representation of each usage plan
   * @returns {Object} a 'catalog object' with id, name, and apis properties
   */
  constructor (usagePlans, sdkGeneration) {
    this.catalog = {
      apiGateway: [],
      generic: []
    }
    this.sdkGeneration = sdkGeneration
    this.usagePlanCatalogs = new Map()
    this.usagePlansAdded = new Set()
    for (const usagePlan of usagePlans) {
      const catalog = {
        id: usagePlan.id,
        name: usagePlan.name,
        throttle: usagePlan.throttle,
        quota: usagePlan.quota,
        apis: []
      }
      for (const usagePlanStage of usagePlan.apiStages) {
        this.usagePlanCatalogs.set(`${usagePlanStage.apiId}_${usagePlanStage.stage}`, catalog)
      }
    }
  }

  addToCatalog ({ id, body, apiId, apiStage, generic }) {
    const key = generic ? id : `${apiId}_${apiStage}`
    const sdkGeneration = Boolean(this.sdkGeneration[key])
    console.log(`This API has a key of ${key} and might be in this.sdkGeneration: ${sdkGeneration}`)
    if (generic) {
      this.catalog.generic.push({ id, apiId, apiStage, sdkGeneration, swagger: body })
    } else {
      exports.copyAnyMethod(body)
      const usagePlanCatalog = this.usagePlanCatalogs.get(key)
      const target = usagePlanCatalog != null ? usagePlanCatalog.apis : this.catalog.generic
      if (usagePlanCatalog != null) {
        if (!this.usagePlansAdded.has(usagePlanCatalog)) {
          this.usagePlansAdded.add(usagePlanCatalog)
          this.catalog.apiGateway.push(usagePlanCatalog)
        }
      }
      target.push({
        id: apiId,
        apiId,
        apiStage,
        sdkGeneration,
        swagger: body
      })
    }
  }
}

const handler = (event) => new Promise((resolve, reject) => {
  console.log(`event: ${inspect(event)}`)

  let s3Request
  let builder = []
  let open = 1

  function abort (err) {
    if (open === 0) return
    open = 0
    if (s3Request != null) {
      s3Request.abort()
      s3Request = null
    }
    return reject(err)
  }

  function complete () {
    if (open === 0) return
    open--
    if (open === 0) {
      console.log(`catalog: ${inspect(builder.catalog)}`)

      const params = {
        Bucket: process.env.BucketName,
        Key: 'catalog.json',
        Body: JSON.stringify(builder.catalog),
        ContentType: 'application/json'
      }

      resolve(exports.s3.upload(params).promise())
    }
  }

  const usagePlansPromise = getAllUsagePlans(exports.apiGateway)
  usagePlansPromise.catch(abort)
  exports.s3.getObject({ Bucket: process.env.BucketName, Key: 'sdkGeneration.json' }).promise()
    .then(response => {
      const sdkGeneration = JSON.parse(response.Body.toString())
      console.log(`sdkGeneration: ${inspect(sdkGeneration)}`)
      usagePlansPromise.then(usagePlans => {
        const swaggers = builder
        console.log(`usagePlans: ${inspect(usagePlans)}`)
        builder = new CatalogBuilder(usagePlans, sdkGeneration)
        for (const s of swaggers) builder.addToCatalog(s)
        complete()
      })
    }, abort)

  function consumeNext (listObjectsResult) {
    if (listObjectsResult.IsTruncated) loop(listObjectsResult.NextContinuationToken)
    for (const file of listObjectsResult.Contents) {
      if (exports.swaggerFileFilter(file)) {
        open++
        getSwaggerFile(file).then(s => {
          complete()
          if (Array.isArray(builder)) {
            builder.push(s)
          } else {
            builder.addToCatalog(s)
          }
        }, abort)
      }
    }
    complete()
  }

  function loop (token) {
    open++
    s3Request = exports.s3.listObjectsV2(
      token != null
        ? { Bucket: process.env.BucketName, Prefix: 'catalog/', ContinuationToken: token }
        : { Bucket: process.env.BucketName, Prefix: 'catalog/' }
    )
    s3Request.promise().then(consumeNext, abort)
  }

  loop()
})

// make available for unit testing
// see: https://stackoverflow.com/questions/45111198/how-to-mock-functions-in-the-same-module-using-jest
// and also: https://luetkemj.github.io/170421/mocking-modules-in-jest/
exports = module.exports = {
  swaggerFileFilter,
  getSwaggerFile,
  CatalogBuilder,
  copyAnyMethod,
  s3: new AWS.S3(),
  apiGateway: new AWS.APIGateway(),
  handler,
  hash
}
