'use strict'

// Note: this is intended to be copied into a new lambda by the user, so it *must not* depend on
// anything within the current developer portal.

const { PassThrough } = require('stream')
const AWS = require('aws-sdk')
const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })
const cognitoIdp = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' })
const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

exports.handler = async event => {
  let userPoolId, adminsGroup, registeredGroup

  {
    const options = { StackName: event.StackName }

    do {
      const resp = await cloudformation.listStackResources(options).promise()

      for (const summary of resp.StackResourceSummaries) {
        if (summary.LogicalResourceId === 'CognitoUserPool') {
          userPoolId = summary.PhysicalResourceId
        } else if (summary.LogicalResourceId === 'CognitoAdminsGroup') {
          adminsGroup = summary.PhysicalResourceId
        } else if (summary.LogicalResourceId === 'CognitoRegisteredGroup') {
          registeredGroup = summary.PhysicalResourceId
        }
        if (userPoolId && adminsGroup && registeredGroup) break
      }

      options.NextToken = resp.NextToken
    } while (options.NextToken != null)
  }

  return new Promise((resolve, reject) => {
    // Using newline-delimited JSON to reduce memory requirements in case the user list is
    // sufficiently large.
    const uploadStream = new PassThrough()
    const uploadPromise = s3.upload({
      Bucket: event.Bucket,
      Key: 'dev-portal-migrate.ndjson',
      Body: uploadStream
    }).promise()

    let open = 1

    function start () {
      open++
    }

    function pass () {
      if (open > 0 && --open === 0) {
        uploadStream.end()
        resolve(uploadPromise)
      }
    }

    function fail (e) {
      if (open > 0) {
        open = 0
        reject(e)
      }
    }

    // The idea here is to process users in parallel and stream them into the S3 bucket, reducing
    // both GC time and memory cost. This means two things:
    //
    // 1. The user list is enumerated in one loop, and simply sends its results to the
    //    `processUser` function.
    // 2. The `processUser` function does its own writing directly, rather than simply returning
    //    any sort of results.

    async function processUser (user) {
      start()

      const options = { UserPoolId: userPoolId, Username: user.Username }
      const groups = new Set()

      do {
        const resp = await cognitoIdp.adminListGroupsForUser(options).promise()
        options.NextToken = resp.NextToken

        for (const group of resp.Groups) {
          if (group.GroupName === adminsGroup) {
            groups.push('admin')
          } else if (group.GroupName === registeredGroup) {
            groups.push('registered')
          }
        }
      } while (options.NextToken != null)

      uploadStream.write(JSON.stringify([user, [...groups]]) + '\n', 'utf-8')
    }

    const userOptions = { UserPoolId: userPoolId }

    async function loopUsers () {
      start()
      const { Users, PaginationToken } = await cognitoIdp.listUsers(userOptions).promise()

      // Recurse before processing further, to schedule the network request in parallel.
      if (PaginationToken != null) {
        loopUsers({ UserPoolId: userPoolId, PaginationToken }).then(pass, fail)
      }

      // Process each user concurrently.
      for (const user of Users) {
        processUser(user).then(pass, fail)
      }
    }

    loopUsers({ UserPoolId: userPoolId }).then(pass, fail)
  })
}
