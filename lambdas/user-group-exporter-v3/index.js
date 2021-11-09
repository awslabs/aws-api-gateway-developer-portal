'use strict'

// Note: this is intended to be copied into a new lambda by the user, so it *must not* depend on
// anything within the current developer portal.

const { PassThrough } = require('stream')
const AWS = require('aws-sdk')
const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })
const cognitoIdp = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' })
const s3 = new AWS.S3({ apiVersion: '2006-03-01' })
const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' })
const sts = new AWS.STS({ apiVersion: '2011-06-15' })

// Using newline-delimited JSON to reduce memory requirements in case the user list is
// sufficiently large.
async function uploadJsonStream ({ event, file, hwm }, init) {
  const callerIdentity = await sts.getCallerIdentity({}).promise()

  console.log(`Creating stream to s3://${event.Bucket}/${file}`)
  const uploadStream = new PassThrough({ writableHighWaterMark: hwm })
  const uploadPromise = s3.upload({
    Bucket: event.Bucket,
    Key: file,
    Body: uploadStream,
    ExpectedBucketOwner: callerIdentity.Account
  }).promise()

  try {
    await init(item => {
      uploadStream.write(JSON.stringify(item) + '\n')
    })
  } finally {
    uploadStream.end()
    console.log(`Closing stream for s3://${event.Bucket}/${file}`)
    await uploadPromise
  }
}

function createBackup (event, file, sourceTable) {
  return uploadJsonStream({ event, file, hwm: 16 /* MB */ * 1024 /* KB */ * 1024 /* B */ }, async write => {
    const options = { TableName: sourceTable }

    do {
      console.log('Reading users')
      const resp = await dynamodb.scan(options).promise()

      options.ExclusiveStartKey = resp.LastEvaluatedKey

      for (const item of resp.Items) write(item)
    } while (options.ExclusiveStartKey != null)
  })
}

exports.handler = async event => {
  let userPoolId, adminsGroup, registeredGroup
  let customersTableName, feedbackTableName

  console.log('Reading stack resources')

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

  const promises = []

  console.log('Creating customers table backup')
  promises.push(createBackup(event, 'dev-portal-migrate/customers.ndjson', customersTableName))

  if (feedbackTableName) {
    promises.push(createBackup(event, 'dev-portal-migrate/feedback.ndjson', feedbackTableName))
  } else {
    console.log('No feedback table found, skipping backup')
  }

  console.log('Creating user pool backup')

  promises.push(uploadJsonStream({
    event,
    file: 'dev-portal-migrate/users.ndjson',
    // Set a much higher high water mark than the default - this is only used once, and the
    // pipeline won't wait for it to buffer. Intermediate values shouldn't come anywhere close
    // to this.
    hwm: 64 /* MB */ * 1024 /* KB */ * 1024 /* B */
  }, write => new Promise((resolve, reject) => {
    let open = 1

    function pass () {
      if (open > 0 && --open === 0) {
        console.log('Users backed up, ending upload stream and returning')
        resolve()
      }
    }

    function fail (e) {
      if (open > 0) {
        open = 0
        console.error('An error occurred', e)
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
      open++
      console.log(`Backing up user: ${user.Username}`)

      const options = { UserPoolId: userPoolId, Username: user.Username }
      let isAdmin = false
      let isRegistered = false

      console.log(`Enumerating groups for user: ${user.Username}`)
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

      console.log(`Serializing attributes for user: ${user.Username}`)
      // Only serialize what's needed, to save space and speed up restoration.
      // (Restoration is more network-intensive than backup.)
      const attributes = Object.create(null)

      for (const attr of user.Attributes) {
        attributes[attr.Name] = attr.Value
      }

      attributes.email = user.Username
      attributes._isAdmin = isAdmin
      attributes._isRegistered = isRegistered

      console.log(`Writing user: ${user.Username}`)
      write(attributes)
    }

    open++
    ;(async () => {
      const userOptions = { UserPoolId: userPoolId }

      do {
        console.log('Reading users')
        const { Users, PaginationToken } = await cognitoIdp.listUsers(userOptions).promise()

        userOptions.PaginationToken = PaginationToken

        // Process each user concurrently.
        for (const user of Users) {
          processUser(user).then(pass, fail)
        }
      } while (userOptions.PaginationToken != null)
    })().then(pass, fail)
    pass()
  })))

  await Promise.all(promises)
}
