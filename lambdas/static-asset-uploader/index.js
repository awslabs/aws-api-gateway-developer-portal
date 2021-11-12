'use strict'

const path = require('path')
const AWS = require('aws-sdk')
const notifyCFN = require('dev-portal-common/notify-cfn')
const { inspectStringify } = require('dev-portal-common/inspect-stringify')
const fs = require('fs')
const klaw = require('klaw')
// const crypto = require('crypto')

const s3 = new AWS.S3()

/**
 * Removes the leading slash from a filePath if it exists.
 *
 * If the filePath has a leading slash, s3 interprets that leading slash as an unnamed top-level directory that
 * all other files nest under; this causes the static website to infinitely redirect.
 *
 * @param {string} filePath
 * @returns {string} File path without a leading slash
 */
function sanitizeFilePath (filePath) {
  return filePath.replace(/^\/+/, '')
}

/**
 * Takes an absolute, lambda file path (e.g., /var/task/build/sdks/android_2016-10-21_19-26Z.zip and generalizes it
 * into a relative path suitable for use as a static s3 site key (e.g., sdks/android_2016-10-21_19-26Z.zip).
 *
 * @param {string} filePath
 * @returns {string} Relative file path, starting at (and excluding) the first occurrence of /build/
 */
function generalizeFilePath (filePath) {
  return filePath.replace(/^.*?\/build\//, '')
}

/**
 * Determines the correct content type for a file, using the extension in the file's (absolute or relative) path.
 *
 * By default, s3 sets the content type to application/octet-stream, which results in browsers downloading the assets
 * instead of serving them as a webpage.
 *
 * @param {string} filePath
 * @returns {string} ContentType corresponding to the file extension in the file path provided
 */
function determineContentType (filePath) {
  switch (path.extname(filePath)) {
    case '.html': return 'text/html'
    case '.css': return 'text/css'
    case '.js': return 'application/javascript'
    case '.png': return 'image/png'
    case '.jpg': case '.jpeg': return 'image/jpeg'
    default: return 'application/octet-stream'
  }
}

/**
 * Deletes all the objects in an S3 bucket. This is useful because the bucket must be empty (zero objects) before it
 * can be deleted by CFN. So, when the custom resource receives a DELETE request from CFN, it first deletes all the
 * files in the S3 bucket, then tells CFN that the deletion succeeded, at which point CFN deletes the now-empty bucket.
 * This is safe to use on both empty and non-empty buckets.
 *
 * @param bucketName the name of the bucket to be cleaned
 * @returns {Promise.<Object>|undefined} the object returned by the S3 SDK or, if the bucket was empty, undefined
 */
async function cleanS3Bucket (bucketName) {
  const result = await s3.listObjectsV2({
    Bucket: bucketName,
    ExpectedBucketOwner: process.env.SourceAccount
  }).promise()

  console.log(`result: ${inspectStringify(result)}`)
  const keys = result.Contents.map((obj) => {
    console.log(`obj: ${inspectStringify(obj)}`)
    return { Key: obj.Key }
  })

  if (keys.length) {
    console.log(`Attempting to delete ${keys.length} objects. The first one in the list is: ${keys[0].Key}`)
    const result = await s3.deleteObjects({
      Bucket: bucketName,
      Delete: {
        Objects: keys
      },
      ExpectedBucketOwner: process.env.SourceAccount
    }).promise()
    console.log(`deleteObjects result: ${inspectStringify(result)}`)
  }
}

/**
 * Creates a catalog directory for the user to put API specifications in.
 *
 * @param staticBucketName the name of the bucket the folder should be created in
 * @returns {Promise.<Object>} the object returned by the headObject operation or the upload operation
 */
async function createCatalogDirectory (staticBucketName) {
  try {
    await s3.upload({ Bucket: staticBucketName, Key: 'catalog/', Body: '', ExpectedBucketOwner: process.env.SourceAccount }).promise()
  } catch (err) {
    console.log('Error creating "catalog" directory', err)
  }
}

/**
 * Checks to see if an sdkGeneration file exists, and creates it if it does not.
 *
 * @param staticBucketName the name of the bucket the file should exist in
 * @returns {Promise.<Object>} the object returned by the headObject operation or the upload operation
 */
async function createSdkGenerationFile (staticBucketName) {
  try {
    return await s3.headObject({ Bucket: staticBucketName, Key: 'sdkGeneration.json', ExpectedBucketOwner: process.env.SourceAccount }).promise()
  } catch (_) {
    // assume it's a NotFound error, and upload a new version
    console.log('Uploading sdkGeneration.json since it seems to not exist')
    const params = { Bucket: staticBucketName, Key: 'sdkGeneration.json', Body: '{}', ExpectedBucketOwner: process.env.SourceAccount }
    return s3.upload(params).promise()
  }
}

class State {
  constructor (event, context) {
    this.event = event
    this.context = context
  }

  get bucketName () {
    return this.event.ResourceProperties.BucketName
  }

  /**
   * Uses the cfn-response library to notify CloudFormation that this custom resource is done with the task it was
   * invoked to do. This could be the response to a create / update request (which would upload files from S3) or a
   * delete request (which would delete files from S3).
   *
   * @param {Object} responseData extra information about the processing for CFN; must be an object
   * @param {Object} event the CFN request object that kicked off this custom resource
   * @param {Object} context lambda function context
   *
   * @returns {Promise} a promise representing notifying CFN of completion; return this to the node runtime
   */
  notifyCFNThatUploadSucceeded (responseData) {
    return notifyCFN.ofSuccess({ event: this.event, context: this.context, responseData })
  }

  /**
   * Uses the cfn-response library to notify CloudFormation that this custom resource failed to do the task it was
   * invoked to do.
   *
   * @param {Error|string} error either an error object or a string representing it
   * @param {Object} event the CFN request object that kicked off this custom resource
   * @param {Object} context lambda function context
   *
   * @returns {Promise} a promise representing notifying CFN of completion; return this to the node runtime
   */
  notifyCFNThatUploadFailed (error) {
    return notifyCFN.ofFailure({ event: this.event, context: this.context, error })
  }

  addConfigFile (bucketName) {
    const configObject = {
      restApiId: this.event.ResourceProperties.RestApiId,
      region: this.event.ResourceProperties.Region,
      identityPoolId: this.event.ResourceProperties.IdentityPoolId,
      userPoolId: this.event.ResourceProperties.UserPoolId,
      userPoolClientId: this.event.ResourceProperties.UserPoolClientId,
      userPoolDomain: this.event.ResourceProperties.UserPoolDomain,
      // this is a stringified boolean here; let's go ahead and make it a real boolean
      feedbackEnabled: this.event.ResourceProperties.FeedbackEnabled === 'true'
    }
    const params = {
      Bucket: bucketName,
      Key: 'config.js',
      Body: Buffer.from('window.config=' + JSON.stringify(configObject)),
      ContentType: 'application/javascript',
      ExpectedBucketOwner: process.env.SourceAccount
    }
    const options = {}

    if (this.event.ResourceProperties.DevelopmentMode === 'true') {
      params.ACL = 'public-read'
    }

    // FIXME: Marketplace support is currently broken
    // const suffix = this.event.ResourceProperties.MarketplaceSuffix
    // if (suffix !== 'DevPortalMarketplaceSubscriptionTopic') {
    //   configObject.marketplaceSubscriptionTopic =
    //     `arn:aws:sns:us-east-1:287250355862:aws-mp-subscription-notification-${suffix}`
    // }

    console.log(`Adding uploadPromise for config.js file: ${JSON.stringify(configObject, null, 2)}`)

    return s3.upload(params, options).promise()
  }

  async processFile (fileStat, uploadPromises, bucketName) {
    const filePath = fileStat.path

    try {
      const readResults = await new Promise((resolve, reject) => {
        fs.readFile(filePath, null, (err, data) => {
          if (err) reject(err)
          else resolve(data)
        })
      })
      const params = {
        Bucket: bucketName,
        Key: sanitizeFilePath(generalizeFilePath(filePath)),
        Body: readResults,
        ContentType: determineContentType(filePath),
        ExpectedBucketOwner: process.env.SourceAccount
      }
      const options = {}

      if (this.event.ResourceProperties.DevelopmentMode === 'true') {
        params.ACL = 'public-read'
      }

      // body just pollutes logs and takes up space
      console.log('uploading to s3', {
        Bucket: params.Bucket,
        Key: params.Key,
        BodyLength: params.Body.byteLength,
        ContentType: params.ContentType,
        ExpectedBucketOwner: params.ExpectedBucketOwner
      })
      uploadPromises.push(s3.upload(params, options).promise())
    } catch (error) {
      console.log('Failed to upload:', error)
      this.notifyCFNThatUploadFailed(error)
    }
  }

  async waitForUpload (readPromises, uploadPromises, bucketName) {
    console.log(`readPromises length: ${readPromises.length}`)

    let state = 'read'

    try {
      await Promise.all(readPromises)
      state = 'upload'

      console.log('All read promises resolved.')
      console.log(`uploadPromises length: ${uploadPromises.length}`)

      uploadPromises.push(this.addConfigFile(bucketName))
      await Promise.all(uploadPromises)
    } catch (error) {
      if (state === 'read') {
        console.log('Failed to read file with error:', error)
      } else {
        console.log(`Failed to upload to bucket with name ${bucketName}:`, error)
      }

      return this.notifyCFNThatUploadFailed(error)
    }

    console.log('All upload promises resolved.')
    console.log(`Succeeded in uploading to bucket ${bucketName}.`)
    return this.notifyCFNThatUploadSucceeded({
      status: 'upload_success',
      bucket: bucketName
    })
  }

  uploadStaticAssets (bucketName) {
    const readPromises = []
    const uploadPromises = []

    return new Promise((resolve, reject) => {
      klaw('./build')
        .on('data', (data) => {
          if (data.stats.isDirectory()) return
          // skip config - we generate that later
          if (/build\/config\.js$/.test(data.path)) return
          if (this.event.RequestType === 'Create') {
            // always write everything on Creates
            console.log('pushing b/c Create', data.path)
          } else if (this.event.ResourceProperties.RebuildMode === 'overwrite-content') {
            // always write everything on an overwrite
            console.log('pushing b/c RebuildMode=overwrite-content', data.path)
          } else if (!/build\/custom-content/.test(data.path)) {
            // only write non custom-content files on everything else
            console.log('pushing b/c not custom', data.path)
          } else {
            console.log('not pushing', data.path)
            return
          }
          readPromises.push(this.processFile(data, uploadPromises, bucketName))
        })
        .on('error', (error, item) => {
          console.log(`Failed to traverse file system on path ${item && item.path}:`, error)
          reject(error)
        })
        .on('end', () => {
          resolve(this.waitForUpload(readPromises, uploadPromises, bucketName))
        })
    })
      .catch(e => this.notifyCFNThatUploadFailed(e))
  }

  async handler () {
    try {
      const bucketName = this.event.ResourceProperties.BucketName
      const staticBucketName = process.env.StaticBucketName

      if (this.event.RequestType === 'Delete') {
        console.log(`bucketName: ${bucketName}, staticBucketName: ${staticBucketName}`)
        try {
          await module.exports.cleanS3Bucket(bucketName)
          await module.exports.cleanS3Bucket(staticBucketName)
          return await this.notifyCFNThatUploadSucceeded({ status: 'delete_success', bucket: bucketName })
        } catch (error) {
          await this.notifyCFNThatUploadFailed(error)
        }
      } else if (!this.event.ResourceProperties.BucketName) {
        return await this.notifyCFNThatUploadFailed('Bucket name must be specified! See the SAM template.')
      } else {
        await module.exports.createCatalogDirectory(staticBucketName)
        await createSdkGenerationFile(staticBucketName)
        return await this.uploadStaticAssets(bucketName)
      }
    } catch (error) {
      console.log('Caught top-level error:', error)
      return this.notifyCFNThatUploadFailed(error)
    }
  }
}

async function handler (event, context) {
  return new State(event, context).handler()
}

exports = module.exports = {
  s3,
  handler,
  State,
  sanitizeFilePath,
  generalizeFilePath,
  determineContentType,
  cleanS3Bucket,
  createCatalogDirectory
}
