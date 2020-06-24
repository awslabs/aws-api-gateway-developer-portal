'use strict'

// Note: this is intended to be copied into a new lambda by the user, so it *must not* depend on
// anything within the current developer portal.

const { PassThrough } = require('stream')
const AWS = require('aws-sdk')
const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })
const cognitoIdp = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' })
const s3 = new AWS.S3({ apiVersion: '2006-03-01' })
const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' })

exports.handler = async event => {
  let userPoolId, adminsGroup, registeredGroup
  let customersTableName, feedbackTableName

  {
    const options = { StackName: event.StackName }

    // eslint-disable-next-line no-labels
    search:
    do {
      const resp = await cloudformation.listStackResources(options).promise()

      for (const summary of resp.StackResourceSummaries) {
        if (summary.LogicalResourceId === 'CognitoUserPool') {
          userPoolId = summary.PhysicalResourceId
        } else if (summary.LogicalResourceId === 'CognitoAdminsGroup') {
          adminsGroup = summary.PhysicalResourceId
        } else if (summary.LogicalResourceId === 'CognitoRegisteredGroup') {
          registeredGroup = summary.PhysicalResourceId
        } else if (summary.LogicalResourceId === 'CustomersTable') {
          customersTableName = summary.PhysicalResourceId
        } else if (summary.LogicalResourceId === 'FeedbackTable') {
          feedbackTableName = summary.PhysicalResourceId
        }

        if (
          userPoolId &&
          adminsGroup &&
          registeredGroup &&
          customersTableName &&
          feedbackTableName
        ) {
          // eslint-disable-next-line no-labels
          break search
        }
      }

      options.NextToken = resp.NextToken
    } while (options.NextToken != null)
  }

  await dynamodb.createBackup({
    TableName: customersTableName,
    BackupName: event.BackupPrefix + '-Customers'
  })

  await dynamodb.createBackup({
    TableName: feedbackTableName,
    BackupName: event.BackupPrefix + '-Feedback'
  })

  return new Promise((resolve, reject) => {
    // Using newline-delimited JSON to reduce memory requirements in case the user list is
    // sufficiently large.
    const uploadStream = new PassThrough({
      // Set a much higher high water mark than the default - this is only used once, and the
      // pipeline won't wait for it to buffer. Intermediate values shouldn't come anywhere close
      // to this.
      writableHighWaterMark: 64 /* MB */ * 1024 /* KB */ * 1024 /* B */
    })
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
      let isAdmin = false
      let isRegistered = false

      do {
        const resp = await cognitoIdp.adminListGroupsForUser(options).promise()
        options.NextToken = resp.NextToken

        for (const group of resp.Groups) {
          if (group.GroupName === adminsGroup) {
            isAdmin = true
          } else if (group.GroupName === registeredGroup) {
            isRegistered = true
          }
        }
      } while (options.NextToken != null)

      // Only serialize what's needed, to save space and speed up restoration.
      // (Restoration is more network-intensive than backup.)
      const attributes = Object.create(null)

      for (const attr of user.Attributes) {
        attributes[attr.Name] = attr.Value
      }

      attributes._isAdmin = isAdmin
      attributes._isRegistered = isRegistered

      uploadStream.write(JSON.stringify(attributes) + '\n', 'utf-8')
    }

    start()

    ;(async () => {
      const userOptions = { UserPoolId: userPoolId }

      do {
        const { Users, PaginationToken } = await cognitoIdp.listUsers(userOptions).promise()

        userOptions.PaginationToken = PaginationToken

        // Process each user concurrently.
        for (const user of Users) {
          processUser(user).then(pass, fail)
        }
      } while (userOptions.PaginationToken != null)
    })().then(pass, fail)
  })
}
