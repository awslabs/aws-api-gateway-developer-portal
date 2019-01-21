'use strict';

let AWS = require('aws-sdk'),
    response = require('cfn-response'),
    fse = require('fs-extra'),
    klaw = require('klaw'),
    through = require('through2'),
    _ = require('lodash'),
    crypto = require('crypto')

/**
 * Uses the cfn-response library to notify CloudFormation that this custom resource is done with the task it was
 * invoked to do. This could be the response to a create / update request (which would upload files from S3) or a
 * delete request (which would delete files from S3).
 * 
 * Send through a hash to tell CFN that we're not going to delete this resource.
 *
 * @param {Object} responseData extra information about the processing for CFN; must be an object
 * @param {Object} event the CFN request object that kicked off this custom resource
 * @param {Object} context lambda function context
 */
function notifyCFNThatUploadSucceeded(responseData, event, context) {
    let hash = crypto.createHash('md5').update(JSON.stringify(responseData)).digest('hex')
    response.send(event, context, response.SUCCESS, responseData, hash)
}

/**
 * Uses the cfn-response library to notify CloudFormation that this custom resource failed to do the task it was
 * invoked to do.
 *
 * @param {Error|string} error either an error object or a string representing it
 * @param {Object} event the CFN request object that kicked off this custom resource
 * @param {Object} context lambda function context
 */
function notifyCFNThatUploadFailed(error, event, context) {
    let errorMessage = error.stack ? error.stack : error
    response.send(event, context, response.FAILED, { error: errorMessage })
}

/**
 * Removes the leading slash from a filePath if it exists.
 *
 * If the filePath has a leading slash, s3 interprets that leading slash as an unnamed top-level directory that
 * all other files nest under; this causes the static website to infinitely redirect.
 *
 * @param {string} filePath
 * @returns {string} File path without a leading slash
 */
function sanitizeFilePath(filePath) {
    while(filePath[0] === '/') {
        filePath = filePath.slice(1)
    }
    return filePath
}

/**
 * Takes an absolute, lambda file path (e.g., /var/task/build/sdks/android_2016-10-21_19-26Z.zip and generalizes it
 * into a relative path suitable for use as a static s3 site key (e.g., sdks/android_2016-10-21_19-26Z.zip).
 *
 * @param {string} filePath
 * @returns {string} Relative file path, starting at (and excluding) the first occurrence of /build/
 */
function generalizeFilePath(filePath) {
    return filePath.substring(filePath.indexOf('/build/')+'/build/'.length)
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
function determineContentType(filePath) {
    let extension = filePath.split('.').pop(),
        contentType = 'application/octet-stream'

    if (extension === 'html') contentType = 'text/html'
    if (extension === 'css') contentType = 'text/css'
    if (extension === 'js') contentType = 'application/javascript'
    if (extension === 'png' || extension === 'jpeg' || extension === 'gif') contentType = 'image/' + extension
    // note that jpg is a valid file extension
    // but the contentType should be image/jpeg !
    if (extension === 'jpg') contentType = 'image/' + 'jpeg'

    return contentType
}

/**
 * Filters directories out of the stream produced by klaw.
 *
 * Uses through2 to create the stream handler from a function. Note that this function must be provided a stream of
 * fs.Stats objects (i.e., the objects in the stream must have a stats property with an isDirectory method).
 *
 * See the documentation on klaw: https://github.com/jprichardson/node-klaw
 * See the documentation on through2's transformFunction API: https://github.com/rvagg/through2#readme
 */
const excludeDirFactory = () => {
    return through.obj(function (item, enc, next) {
        if (!item.stats.isDirectory()) this.push(item)
        next()
    })
}

/**
 * Decides if we should overwrite the custom-content. (Yes if it's a Create call or if the RebuildMode is set to `overwrite-content`.)
 *
 * Uses through2 to create the stream handler from a function. Note that this function must be provided a stream of
 * fs.Stats objects (i.e., the objects in the stream must have a stats property with an isDirectory method).
 *
 * See the documentation on klaw: https://github.com/jprichardson/node-klaw
 * See the documentation on through2's transformFunction API: https://github.com/rvagg/through2#readme
 */
const excludeCustomContentFactory = (eventType, rebuildMode) => {
    return through.obj(function (item, enc, next) {
        // always write everything on Creates
        if (eventType === "Create") {
            console.log('pushing b/c Create', item.path)
            this.push(item)
        } 
        // always write everything on an overwrite
        else if (rebuildMode === "overwrite-content") {
            this.push(item)
        }

        // only write non custom-content files on everything else
        else if ( !/build\/custom-content/.test(item.path) ) {
            console.log('pushing b/c not custom', item.path)
            this.push(item)
        } 
        
        else {
            console.log('not pushing', item.path)
        }
        next()
    })
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
function cleanS3Bucket(bucketName) {
    let params = {
        Bucket: bucketName,
    }

    return exports.s3.listObjectsV2(params).promise()
        .then(result => {
            console.log(`result: ${JSON.stringify(result, null, 4)}`)
            let keys = _.map(result.Contents, (obj) => {
                console.log(`obj: ${JSON.stringify(obj)}`)
                return { Key: obj.Key }
            }),
            params = {
                Bucket: bucketName,
                Delete: {
                    Objects: keys
                },
            }

            if(keys.length) {
              console.log(`Attempting to delete ${keys.length} objects. The first one in the list is: ${_.get(keys, '[0].Key')}`)
              return exports.s3.deleteObjects(params).promise()
                .then((result) => console.log(`deleteObjects result: ${JSON.stringify(result, null, 4)}`))
            } else {
              return Promise.resolve()
            }
        })
}

function createCatalogDirectory(staticBucketName) {
    let params = { Bucket: staticBucketName, Key: 'catalog/', Body: '' }
    return exports.s3.upload(params).promise()
}

function addConfigFile(bucketName, event) {
    let configObject = {
            restApiId: event.ResourceProperties.RestApiId,
            region: event.ResourceProperties.Region,
            identityPoolId: event.ResourceProperties.IdentityPoolId,
            userPoolId: event.ResourceProperties.UserPoolId,
            userPoolClientId: event.ResourceProperties.UserPoolClientId,
            userPoolDomain: event.ResourceProperties.UserPoolDomain
        },
        params = {
            Bucket: bucketName,
            Key: 'config.js',
            Body: Buffer.from("window.config=" + JSON.stringify(configObject)),
            ACL: "public-read"
        },
        options = {}

    console.log(`Adding uploadPromise for config.js file: ${JSON.stringify(configObject, null, 2)}`)

    let suffix = event.ResourceProperties.MarketplaceSuffix
    if (suffix !== 'DevPortalMarketplaceSubscriptionTopic') {
        configObject.marketplaceSubscriptionTopic
            = `arn:aws:sns:us-east-1:287250355862:aws-mp-subscription-notification-${suffix}`
    }

    return exports.s3.upload(params, options).promise()
}

function processFile(fileStat, readPromises, uploadPromises, bucketName, event, context) {
    let filePath = fileStat.path,
        thisReadPromise = fse.readFile(filePath)

    thisReadPromise
        .then(readResults => {
            let params = {
                    Bucket: bucketName,
                    Key: sanitizeFilePath(generalizeFilePath(filePath)),
                    Body: readResults,
                    ACL: "public-read",
                    ContentType: determineContentType(filePath)
                },
                options = {}

            uploadPromises.push(exports.s3.upload(params, options).promise())
        })
        .catch(error => {
            console.log(`Failed to upload:`, error)
            notifyCFNThatUploadFailed(error, event, context)
        })

    readPromises.push(thisReadPromise)
}

function waitForUpload(readPromises, uploadPromises, bucketName, event, context) {
    console.log(`readPromises length: ${readPromises.length}`)

    return Promise.all(readPromises)
        .then(() => {
            console.log('All read promises resolved.')
            console.log(`uploadPromises length: ${uploadPromises.length}`)

            uploadPromises.push(addConfigFile(bucketName, event))

            return Promise.all(uploadPromises)
                .then(() => {
                    console.log(`All upload promises resolved.`)
                    console.log(`Succeeded in uploading to bucket ${bucketName}.`)
                    exports.notifyCFNThatUploadSucceeded({
                        status: 'upload_success',
                        bucket: bucketName
                    }, event, context)
                })
                .catch(error => {
                    console.log(`Failed to upload to bucket with name ${bucketName}:`, error)
                    exports.notifyCFNThatUploadFailed(error, event, context)
                })
        })
        .catch(error => {
            console.log('Failed to read file with error:', error)
            exports.notifyCFNThatUploadFailed(error, event, context)
        })
}

function uploadStaticAssets(bucketName, event, context) {
    let excludeDirFilter = excludeDirFactory()
    let excludeCustomContentFilter = excludeCustomContentFactory(event.RequestType, event.ResourceProperties.RebuildMode)
    let readPromises = [],
        uploadPromises = []

    return klaw('./build')
        .on('error', (err, item) => excludeDirFilter.emit('error', err, item))
        .pipe(excludeDirFilter)
        .on('error', (err, item) => excludeCustomContentFilter.emit('error', err, item))
        .pipe(excludeCustomContentFilter)
        .on('data', (data) => processFile(data, readPromises, uploadPromises, bucketName, event, context))
        .on('error', (error, item) => {
            console.log(`Failed to traverse file system on path ${item && item.path}:`, error)
            notifyCFNThatUploadFailed(error, event, context)
        })
        .on('end', () => waitForUpload(readPromises, uploadPromises, bucketName, event, context))
}

function handler(event, context) {
    try {
        let bucketName = event.ResourceProperties.BucketName,
          staticBucketName = process.env.StaticBucketName

        if (event.RequestType === "Delete") {
            console.log(`bucketName: ${bucketName}, staticBucketName: ${staticBucketName}`)
            return exports.cleanS3Bucket(bucketName)
                .then(() => exports.cleanS3Bucket(staticBucketName))
                .then(() => {
                    exports.notifyCFNThatUploadSucceeded({status: 'delete_success', bucket: bucketName}, event, context)
                })
                .catch((error) => {
                    exports.notifyCFNThatUploadFailed(error, event, context)
                })
        } else if (!event.ResourceProperties.BucketName) {
            exports.notifyCFNThatUploadFailed("Bucket name must be specified! See the SAM template.", event, context)
        } else {
            exports.createCatalogDirectory(staticBucketName)
                .then(exports.uploadStaticAssets(bucketName, event, context))
        }
    } catch(error) {
        console.log(`Caught top-level error:`, error)
        notifyCFNThatUploadFailed(error, event, context)
    }
}

exports = module.exports = {
    s3: new AWS.S3(),
    handler,
    sanitizeFilePath,
    determineContentType,
    cleanS3Bucket,
    createCatalogDirectory,
    generalizeFilePath,
    notifyCFNThatUploadSucceeded,
    notifyCFNThatUploadFailed,
    excludeDirFactory,
    excludeCustomContentFactory,
    uploadStaticAssets
}