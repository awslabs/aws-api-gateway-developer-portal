'use strict'

const readline = require('readline')
const AWS = require('aws-sdk')
const { PassThrough, pipeline } = require('stream')
const fetch = require('node-fetch')
const cognitoIdp = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' })
const s3 = new AWS.S3({ apiVersion: '2006-03-01' })
const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' })

const userPoolId = process.env.UserPoolId
const logsRoleArn = process.env.LogsRoleArn
const adminsGroup = process.env.AdminsGroup
const registeredGroup = process.env.RegisteredGroup
const customersTableName = process.env.CustomersTable
const feedbackTableName = process.env.FeedbackTable

async function locateBackupArns (event) {
  let customersTableArn = event.CustomersBackupArn
  let feedbackTableArn = event.FeedbackBackupArn

  const options = { BackupType: 'USER' }

  if (customersTableArn && feedbackTableArn) return { customersTableArn, feedbackTableArn }

  do {
    const resp = await dynamodb.listBackups(options).promise()

    // Break early - we probably ran out of ARNs here.
    if (!resp.BackupSummaries.length) break
    options.LastEvaluatedBackupArn = resp.BackupSummaries[resp.BackupSummaries.length - 1]

    for (const backup of resp.BackupSummaries) {
      if (backup.BackupName === event.BackupPrefix + '-Customers') {
        if (!customersTableArn) customersTableArn = backup.BackupArn
      } else if (backup.BackupName === event.BackupPrefix + '-Feedback') {
        if (!feedbackTableArn) feedbackTableArn = backup.BackupArn
      }

      if (customersTableArn && feedbackTableArn) return { customersTableArn, feedbackTableArn }
    }
  } while (options.NextToken != null)

  throw new Error("Couldn't locate all requisite backups. Please look up their ARN and search for them directly")
}

function readMigrateLines (event) {
  return new Promise((resolve, reject) => {
    const downloadReq = s3.getObject({
      Bucket: event.Bucket,
      Key: 'dev-portal-migrate.ndjson'
    })

    downloadReq.on('httpHeaders', (statusCode, httpHeaders) => {
      console.log('statusCode:', statusCode)
      console.log('httpHeaders:', httpHeaders)

      if ((statusCode >= 200 && statusCode < 300) || statusCode === 304) {
        resolve(lineStream)
      } else {
        reject(new Error('Network error'))
      }
    })

    const bufferedStream = new PassThrough({
      // Set a much higher high water mark than the default - this is only used once, and the
      // pipeline will likely consume data slower than it's received due to parsing overhead.
      writableHighWaterMark: 64 /* MB */ * 1024 /* KB */ * 1024 /* B */
    })

    const lineStream = readline.createInterface({
      input: bufferedStream,
      crlfDelay: Infinity
    })

    pipeline(downloadReq.createReadStream(), bufferedStream)
  })
}

exports.handler = async event => {
  const { customersTableArn, feedbackTableArn } = await locateBackupArns(event)

  await Promise.all([
    dynamodb.describeTable({ TableName: customersTableName }).promise()
      .then(resp => dynamodb.restoreTableFromBackup({
        TargetTableName: customersTableName,
        BackupArn: customersTableArn,
        GlobalSecondaryIndexOverride: resp.Table.GlobalSecondaryIndexes,
        LocalSecondaryIndexOverride: resp.Table.LocalSecondaryIndexes
      }).promise()),
    dynamodb.describeTable({ TableName: feedbackTableName }).promise()
      .then(resp => dynamodb.restoreTableFromBackup({
        TargetTableName: feedbackTableName,
        BackupArn: feedbackTableArn,
        GlobalSecondaryIndexOverride: resp.Table.GlobalSecondaryIndexes,
        LocalSecondaryIndexOverride: resp.Table.LocalSecondaryIndexes
      }).promise())
  ])

  // Using newline-delimited JSON to reduce memory requirements in case the user list is
  // sufficiently large.

  const jobName = `DevPortalV4ImportJob-${Math.random()}`
  const [{ CSVHeader }, { UserImportJob: job }] = await Promise.all([
    cognitoIdp.getCSVHeader({ UserPoolId: userPoolId }).promise(),
    cognitoIdp.createUserImportJob({
      CloudWatchLogsRoleArn: logsRoleArn,
      JobName: jobName,
      UserPoolId: userPoolId
    }).promise()
  ])

  const uploadStream = new PassThrough({
    // Set a much higher high water mark than the default - this is only used once, and the
    // pipeline won't wait for it to buffer. Intermediate values shouldn't come anywhere close to
    // this.
    writableHighWaterMark: 32 /* MB */ * 1024 /* KB */ * 1024 /* B */
  })
  const fetchPromise = fetch(job.PreSignedUrl, {
    method: 'POST',
    body: uploadStream
  })

  // Write the headers first.
  uploadStream.write(CSVHeader.join(',') + '\n')

  for await (const line of readMigrateLines(event)) {
    if (line) {
      const attributes = JSON.parse(line)

      const parts = CSVHeader.map(key => {
        switch (key) {
          case 'cognito:mfa_enabled': return 'FALSE' // MFA is not configured for this pool.
          case 'cognito:username': return attributes.sub
          default: {
            const value = attributes[key]
            if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
            if (typeof value === 'number') return `${value}`
            if (typeof value === 'string') return value.replace(/,/g, '\\,')
            throw new Error(`Unknown value type: ${value}`)
          }
        }
      })

      uploadStream.write(parts.join(',') + '\n', 'utf-8')
    }
  }

  uploadStream.end()

  const response = await fetchPromise
  if (!response.ok) throw new Error(response.statusText)

  await cognitoIdp.startUserImportJob({
    JobId: job.JobId,
    UserPoolId: userPoolId
  })

  const longPollDuration = 10 /* seconds */ * 1000 /* millis */

  while (true) {
    await new Promise(resolve => setTimeout(resolve, longPollDuration))
    const resp = await cognitoIdp.describeUserImportJob({
      JobId: job.JobId,
      UserPoolId: userPoolId
    }).promise()

    if (resp.UserImportJob.Status === 'Succeeded') break
    if (resp.UserImportJob.Status === 'Failed') {
      throw new Error('Import job failed')
    }
  }

  let open = 1
  let resolveFn, rejectFn
  const writePromise = new Promise((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })

  function pass () {
    if (open > 0 && --open === 0) resolveFn()
  }

  function fail (e) {
    if (open > 0) {
      open = 0
      rejectFn(e)
    }
  }

  for await (const line of readMigrateLines(event)) {
    if (line) {
      const { _isAdmin, _isRegistered, sub } = JSON.stringify(line)

      if (_isAdmin) {
        // Don't block - we're doing this as we're also still receiving data from the network.
        open++
        cognitoIdp.adminAddUserToGroup({
          UserPoolId: userPoolId,
          Username: sub,
          GroupName: adminsGroup
        }).promise().then(pass, fail)
      }

      if (_isRegistered) {
        // Don't block - we're doing this as we're also still receiving data from the network.
        open++
        cognitoIdp.adminAddUserToGroup({
          UserPoolId: userPoolId,
          Username: sub,
          GroupName: registeredGroup
        }).promise().then(pass, fail)
      }
    }
  }

  pass()
  await writePromise
}
