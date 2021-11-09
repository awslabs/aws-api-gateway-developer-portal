// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict'

// TODO: This whole lambda may need to be 'debounced' in the future via SNS/SQS
// Right now it runs once per file, on every file, and thus may have nasty race conditions

const AWS = require('aws-sdk')
const yaml = require('js-yaml')
let bucketName = ''
const hash = require('object-hash')
const path = require('path')

const { getAllUsagePlans } = require('dev-portal-common/get-all-usage-plans')
const { inspectStringify } = require('dev-portal-common/inspect-stringify')

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
  console.log(`file ${file.Key} is${isSwagger ? '' : ' not'} a swagger file.`)
  return isSwagger
}

/**
 * Takes an s3 file representation and fetches the file's body, putting it into a new, internal file representation.
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
 * @returns {Promise.<Object>} a promise that resolves to an internal file representation
 */
async function getSwaggerFile (file) {
  const params = {
    Bucket: bucketName,
    Key: file.Key,
    ExpectedBucketOwner: process.env.SourceAccount
  }

  const s3Repr = await exports.s3.getObject(params).promise()

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

async function handler (event, context) {
  console.log(`event: ${inspectStringify(event)}`)
  bucketName = process.env.BucketName

  const sdkGeneration = JSON.parse(
    (await exports.s3.getObject({ Bucket: bucketName, Key: 'sdkGeneration.json', ExpectedBucketOwner: process.env.SourceAccount }).promise())
      .Body.toString()
  )
  console.log(`sdkGeneration: ${inspectStringify(sdkGeneration)}`)

  const usagePlansPromise = getAllUsagePlans(exports.apiGateway)
  const builderPromise = usagePlansPromise.then(usagePlans => {
    console.log(`usagePlans: ${inspectStringify(usagePlans)}`)
    return new CatalogBuilder(usagePlans, sdkGeneration)
  })

  const promises = []
  let token

  while (true) {
    const listObjectsResult = await exports.s3.listObjectsV2(
      token != null
        ? { Bucket: bucketName, Prefix: 'catalog/', ContinuationToken: token, ExpectedBucketOwner: process.env.SourceAccount }
        : { Bucket: bucketName, Prefix: 'catalog/', ExpectedBucketOwner: process.env.SourceAccount }
    ).promise()

    for (const file of listObjectsResult.Contents) {
      if (exports.swaggerFileFilter(file)) {
        promises.push(
          builderPromise.then(builder =>
            exports.getSwaggerFile(file).then(s => builder.addToCatalog(s))
          )
        )
      }
    }

    if (!listObjectsResult.IsTruncated) break
    token = listObjectsResult.NextContinuationToken
  }

  await Promise.all(promises)
  const { catalog } = await builderPromise

  console.log(`catalog: ${inspectStringify(catalog)}`)

  const params = {
    Bucket: bucketName,
    Key: 'catalog.json',
    Body: JSON.stringify(catalog),
    ContentType: 'application/json',
    ExpectedBucketOwner: process.env.SourceAccount
  }

  await exports.s3.upload(params).promise()
}

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
