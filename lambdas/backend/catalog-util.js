'use strict'

const util = require('./util')

// TODO: switch to SQS with a pair of queues (input with files, output with notifications) and just
// use that instead for detecting S3 changes.
async function catalogUpdate () {
  console.log('awaiting catalog update')

  // This will end up invoked twice, but I'd like to be able to track how long it takes to
  // update. Ideally, I would also prevent executing the lambda from the S3 side as well, but
  // that's not as easy as it sounds.
  await util.lambda.invoke({
    FunctionName: process.env.CatalogUpdaterFunctionArn,
    // this API would be more performant if we moved to 'Event' invocations, but then we couldn't signal to
    // admins when the catalog updater failed to update the catalog; they'd see a 200 and then no change in
    // behavior.
    InvocationType: 'RequestResponse',
    LogType: 'None'
  }).promise()
}

exports.uploadFile = async (file, body) => {
  console.log('upload bucket: ', process.env.StaticBucketName)
  console.log('upload key: ', file)
  console.log('upload body length: ', body.byteLength)
  await util.s3.upload({ Bucket: process.env.StaticBucketName, Key: file, Body: body }).promise()
  await catalogUpdate()
}

exports.deleteFile = async (file) => {
  console.log('remove bucket: ', process.env.StaticBucketName)
  console.log('remove key: ', file)
  await util.s3.deleteObject({ Bucket: process.env.StaticBucketName, Key: file }).promise()
  await catalogUpdate()
}
