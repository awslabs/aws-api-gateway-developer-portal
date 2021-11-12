'use strict'

const util = require('../../../util')

/**
 * Takes an API id (either in the api gateway manaaged APIID_STAGENAME format or the generic HASHEDID format) and a
 * parity (desired state) of the sdkGeneration flag for that API, and updates the file sdkGeneration.json in the static
 * asset bucket in S3. It does this by reading the contents of sdkGeneration.json, then, if the specified API's state
 * is not already the desired state, it uploads the modified sdkGeneration.json and invokes catalogUpdater to "build"
 * the changes from sdkGeneration.json into catalog.json.
 *
 * Note that this DOES NOT RETURN! Instead, it ends the lambda runtime by calling `res...json()`.
 *
 * @param {boolean} parity the desired result of the 'sdkGeneration' flag for the API with 'id' of id
 * @param {String} id the id of the API to be modified
 * @param {Object} res an express response object
 */
exports.idempotentSdkGenerationUpdate = async (parity, id, res) => {
  const sdkGeneration =
    JSON.parse((await util.s3.getObject({
      Bucket: process.env.StaticBucketName,
      Key: 'sdkGeneration.json',
      ExpectedBucketOwner: process.env.SourceAccount
    }).promise()).Body)

  if (sdkGeneration[id] !== parity) {
    sdkGeneration[id] = parity

    await util.s3.upload({
      Bucket: process.env.StaticBucketName,
      Key: 'sdkGeneration.json',
      Body: JSON.stringify(sdkGeneration),
      ExpectedBucketOwner: process.env.SourceAccount
    }).promise()

    // call catalogUpdater to build a fresh catalog.json that includes changes from sdkGeneration.json
    await util.lambda.invoke({
      FunctionName: process.env.CatalogUpdaterFunctionArn,
      // this API would be more performant if we moved to 'Event' invocations, but then we couldn't signal to
      // admins when the catalog updater failed to update the catalog; they'd see a 200 and then no change in
      // behavior.
      InvocationType: 'RequestResponse',
      LogType: 'None'
    }).promise()

    res.status(200).json({ message: 'Success' })
  } else {
    res.status(200).json({ message: 'Success' })
  }
}

exports.put = async (req, res) => {
  console.log(`PUT /admin/catalog/${req.params.id}/sdkGeneration for Cognito ID: ${util.getCognitoIdentityId(req)}`)

  await exports.idempotentSdkGenerationUpdate(true, req.params.id, res)
}

exports.delete = async (req, res) => {
  console.log(`DELETE /admin/catalog/${req.params.id}/sdkGeneration for Cognito ID: ${util.getCognitoIdentityId(req)}`)

  await exports.idempotentSdkGenerationUpdate(false, req.params.id, res)
}
