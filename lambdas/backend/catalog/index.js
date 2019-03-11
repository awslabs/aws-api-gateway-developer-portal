// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

let AWS = require('aws-sdk'),
  s3 = new AWS.S3()

let usagePlanCatalog = []

const usagePlans = function() {
  // TODO: This was previously cached, and could be again, except that there's no mechanism to cache-bust the lambda
  // function when the user updates the catalog. This led to confusing behavior, so I removed it.
  console.log(`usagePlanCatalog: ${JSON.stringify(usagePlanCatalog, null, 4)}`)
  let params = {
    Bucket: process.env.StaticBucketName,
    Key: "catalog.json"
  }

  console.log(`params: ${JSON.stringify(params, null, 4)}`)

  return s3.getObject(params).promise()
    .then((catalog) => {
      let cleanCatalog = JSON.parse(catalog.Body.toString())
      console.log(`catalog: ${ JSON.stringify(cleanCatalog, null, 4) }`)
      usagePlanCatalog = cleanCatalog
      return usagePlanCatalog
    })
    .catch((error) => {
      // don't break if there's no catalog file
      if (error.code === "NoSuchKey") {
        console.error('error: No catalog.json file found. Please upload an api definition to `catalog/`.')

        return []
      }
      
      console.error('error:', error)
      
      throw error
    })
}

module.exports = usagePlans