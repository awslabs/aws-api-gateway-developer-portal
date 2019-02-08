const crypto = require('crypto')

let lastRequestId = ''

/**
 * 
 * The config object used to define the response sent to CloudFormation.
 * 
 * @typedef {Object} ResponseConfig
 * 
 * @property {Object} event - The event object passed in from the lambda function.
 * @property {Object} context - The context object passed in from the lambda function. Required if logStream is not present.
 * @property {string} responseStatus - Indicates if the response was a SUCCESS or FAILURE.
 * @property {Object} responseData - Data to pass to a successful response. Required on SUCCESSes.
 * @property {string|Object} error - The error object or message that indicates failure. Required on FAILUREs.
 * @property {string} [physicalResourceId] - An optional id. Generated from the responseData if not provided.
 * @property {string} [logicalResourceId] - An optional id. Uses the generating lambda function if not provided.
 */

/**
 * Uses the cfn-response library to notify CloudFormation that this custom resource is done with the task it was
 * invoked to do. This could be the response to a create / update request (which would upload files from S3) or a
 * delete request (which would delete files from S3).
 * 
 * Returns a Promise b/c it's being used inside an async function.
 *
 * @param {ResponseConfig} config - context lambda function context
 */
function notifyCFN ({ event, context, responseStatus, responseData, error, physicalResourceId, logicalResourceId }) {
  // if (lastRequestId === event.RequestId)
    // return Promise.reject("Attempted to run `notifyCFN` more than once with the same responseURL. I'm afraid I can't let you do that, Dave.")
  
  // lastRequestId = event.RequestId

  return new Promise((resolve, reject) => {
    let errorMessage = error ? error.message || error.error || error.errorMessage || error : ''

    // if there's no response message, default it based on presence of an error
    if (!responseStatus)
      responseStatus = error ? 'FAILED' : 'SUCCESS' 

    // if there's no physicalResourceId and it's a SUCCESS, fake a physicalResourceId from the responseData
    if (!physicalResourceId)
      physicalResourceId = crypto.createHash('md5').update(JSON.stringify(responseData) || '{}').digest('hex')

    if (!logicalResourceId) logicalResourceId = event.LogicalResourceId

    var responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: (errorMessage || '') + "\n For more details, see CloudWatch group (" + context.logGroupName + ') and stream (' + context.logStreamName + ')',
      PhysicalResourceId: physicalResourceId,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: logicalResourceId, // the lambda function; do we want this?
      Data: responseData
    });

    console.log("Response body:\n", responseBody);

    var https = require("https");
    var url = require("url");

    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: "PUT",
      headers: {
        "content-type": "",
        "content-length": responseBody.length
      }
    };

    var request = https.request(options, function (response) {
      console.log("Status code: " + response.statusCode);
      console.log("Status message: " + response.statusMessage);
      resolve(response);
    });

    request.on("error", function (error) {
      console.log("send(..) failed executing https.request(..): " + error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  })
}

/**
 * Inform CloudFormation this request was a success.
 * 
 * @param {ResponseConfig} config - The config object used to define the response sent to CloudFormation.
 */
function ofSuccess(config) { return notifyCFN({ ...config, responseStatus: 'SUCCESS'}) }

/**
 * Inform CloudFormation this request was a failure.
 * 
 * @param {ResponseConfig} config - The config object used to define the response sent to CloudFormation.
 */
function ofFailure(config) { return notifyCFN({ ...config, responseStatus: 'FAILED'}) }

notifyCFN.ofSuccess = ofSuccess
notifyCFN.ofFailure = ofFailure

module.exports = notifyCFN