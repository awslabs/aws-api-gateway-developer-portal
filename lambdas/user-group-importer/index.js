'use strict'

const readline = require('readline')
const AWS = require('aws-sdk')
const { PassThrough } = require('stream')
const fetch = require('node-fetch')
const cognitoIdp = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' })
const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

const userPoolId = process.env.UserPoolId
const logsRoleArn = process.env.LogsRoleArn
const adminsGroup = process.env.AdminsGroup
const registeredGroup = process.env.RegisteredGroup

function readMigrateLines (sourceBucket) {
  return new Promise((resolve, reject) => {
    const downloadReq = s3.getObject({
      Bucket: sourceBucket,
      Key: 'dev-portal-migrate.ndjson'
    })

    downloadReq.on('httpHeaders', (statusCode, httpHeaders) => {
      console.log('statusCode:', statusCode)
      console.log('httpHeaders:', httpHeaders)

      if ((statusCode >= 200 && statusCode < 300) || statusCode === 304) {
        resolve(downloadIter)
      } else {
        reject(new Error('Network error'))
      }
    })

    const downloadIter = readline.createInterface({
      input: downloadReq.createReadStream(),
      crlfDelay: Infinity
    })
  })
}

exports.handler = async event => {
  const sourceBucket = event.Bucket

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

  const uploadStream = new PassThrough()
  const fetchPromise = fetch(job.PreSignedUrl, {
    method: 'POST',
    body: uploadStream
  })

  // Write the headers first.
  uploadStream.write(CSVHeader.join(',') + '\n')

  for await (const line of readMigrateLines(sourceBucket)) {
    if (line) {
      const [user] = JSON.parse(line)
      const attributes = new Map()

      for (const attr of user.Attributes) {
        attributes.set(attr.Name, attr.Value)
      }

      const parts = CSVHeader.map(key => {
        switch (key) {
          case 'cognito:mfa_enabled': return 'FALSE' // MFA is not configured for this pool.
          case 'cognito:username': return attributes.get('sub')
          default: {
            const value = attributes.get(key)
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

  for await (const line of readMigrateLines(sourceBucket)) {
    if (line) {
      /** @type {[AWS.CognitoIdentityServiceProvider.UserType, string[]]} */
      const [user, groups] = JSON.parse(line)
      const sub = user.Attributes.find(attr => attr.Name === 'sub').Value

      for (const group of groups) {
        if (group === 'admin') {
          // Don't block the reader on this - it's also reading from the network.
          open++
          cognitoIdp.adminAddUserToGroup({
            UserPoolId: userPoolId,
            Username: sub,
            GroupName: adminsGroup
          }).promise().then(pass, fail)
        } else if (group === 'registered') {
          // Don't block the reader on this - it's also reading from the network.
          open++
          cognitoIdp.adminAddUserToGroup({
            UserPoolId: userPoolId,
            Username: sub,
            GroupName: registeredGroup
          }).promise().then(pass, fail)
        }
      }
    }
  }

  pass()
  await writePromise
}
