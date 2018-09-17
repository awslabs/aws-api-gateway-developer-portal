let AWS = require('aws-sdk'),
  s3 = new AWS.S3()

let usagePlanCatalog = []

const usagePlans = function() {
  if(!usagePlanCatalog.length) {
    let params = {
      Bucket: process.env.BucketName,
      Key: "catalog.json"
    }

    return s3.getObject(params).promise()
      .then((catalog) => {
        console.log(`catalog: ${catalog}`)
        usagePlanCatalog = catalog
        return usagePlanCatalog
      })
  } else {
    return Promise.resolve(usagePlanCatalog)
  }
}

module.exports = usagePlans