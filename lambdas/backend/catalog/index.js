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
      console.log(`catalog: ${cleanCatalog}`)
      usagePlanCatalog = cleanCatalog
      return usagePlanCatalog
    })
    .catch((error) => {
      console.log(`error: ${error}`)
      return Promise.reject(error)
    })
}

module.exports = usagePlans