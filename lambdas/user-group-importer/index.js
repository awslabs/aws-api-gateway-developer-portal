'use strict'

const readline = require('readline')
const AWS = require('aws-sdk')
const { PassThrough } = require('stream')
const cognitoIdp = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' })
const s3 = new AWS.S3({ apiVersion: '2006-03-01' })
const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' })

const userPoolId = process.env.UserPoolId
const adminsGroup = process.env.AdminsGroup
const registeredGroup = process.env.RegisteredGroup
const customersTableName = process.env.CustomersTable
const feedbackTableName = process.env.FeedbackTable
const sourceAccount = process.env.SourceAccount

function readMigrateLines (event, file) {
  console.log('Reading lines from migration file')

  return new Promise((resolve, reject) => {
    const downloadReq = s3.getObject({
      Bucket: event.Bucket,
      Key: file,
      ExpectedBucketOwner: sourceAccount
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
      writableHighWaterMark: 32 /* MB */ * 1024 /* KB */ * 1024 /* B */
    })

    const lineStream = readline.createInterface({
      input: bufferedStream,
      crlfDelay: Infinity
    })

    downloadReq.createReadStream()
      .on('error', e => { bufferedStream.destroy(e) })
      .pipe(bufferedStream)
  })
}

function restoreDBBackup (event, file, targetTable) {
  return new Promise((resolve, reject) => {
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

    async function tryWrite (items) {
      let retry = false
      let delay = 500

      while (items.length) {
        if (retry) await new Promise(resolve => setTimeout(resolve, delay))
        const resp = await dynamodb.batchWriteItem({
          RequestItems: { [targetTable]: items }
        }).promise()

        delay *= 2
        items = resp.UnprocessedItems
        retry = true
      }
    }

    let buffer = []

    async function loop () {
      for await (const line of await readMigrateLines(event, file)) {
        if (open === 0) break
        if (line) {
          const record = JSON.parse(line)

          // 25 = max batch size
          if (buffer.length < 25) {
            buffer.push(record)
          } else {
            const items = buffer
            buffer = []
            open++
            tryWrite(items.map(item => ({ PutRequest: { Item: item } }))).then(pass, fail)
          }
        }
      }
    }

    open++
    loop().then(pass, fail)
    pass()
  })
}

exports.handler = async event => {
  const promises = []
  console.log('Restoring customer table from backups')
  promises.push(restoreDBBackup(event, 'dev-portal-migrate/customers.ndjson', customersTableName))
  if (feedbackTableName) promises.push(restoreDBBackup(event, 'dev-portal-migrate/feedback.ndjson', feedbackTableName))

  // Using newline-delimited JSON to reduce memory requirements in case the user list is
  // sufficiently large.

  promises.push((async () => {
    console.log('Starting Cognito import')

    return new Promise((resolve, reject) => {
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

      async function loop () {
        for await (const line of await readMigrateLines(event, 'dev-portal-migrate/users.ndjson')) {
          if (line) {
            const attributes = JSON.parse(line)
            const { _isAdmin, _isRegistered, email } = attributes

            console.log(`Importing user: ${email}`)

            // Don't block - we're doing this as we're also still receiving data from the network.
            open++
            cognitoIdp.adminCreateUser({
              UserPoolId: userPoolId,
              Username: email,
              UserAttributes: [
                ...Object.entries(attributes)
                  .filter(([key]) => key[0] !== '_' && key !== 'sub')
                  .map(([key, value]) => ({
                    Name: key,
                    Value: value
                  })),
                { Name: 'email_verified', Value: 'True' }
              ],
              MessageAction: 'SUPPRESS'
            }).promise().then(() => {
              console.log(`Restoring groups for user: ${email}`)

              if (_isAdmin) {
                // Don't block - we're doing this as we're also still receiving data from the network.
                open++
                cognitoIdp.adminAddUserToGroup({
                  UserPoolId: userPoolId,
                  Username: email,
                  GroupName: adminsGroup
                }).promise().then(pass, fail)
              }

              if (_isRegistered) {
                // Don't block - we're doing this as we're also still receiving data from the network.
                open++
                cognitoIdp.adminAddUserToGroup({
                  UserPoolId: userPoolId,
                  Username: email,
                  GroupName: registeredGroup
                }).promise().then(pass, fail)
              }

              pass()
            }, fail)
          }
        }
      }

      open++
      loop().then(pass, fail)
    })
  })())

  await Promise.all(promises)
}
