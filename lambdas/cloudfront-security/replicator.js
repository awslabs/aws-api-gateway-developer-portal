'use strict'

// Note: this *never* deletes old lambdas. In the future, this could be addressed using a specially
// coded lambda to periodically attempt to delete it.

const path = require('path')
const { PassThrough } = require('stream')
const archiver = require('archiver')
const AWS = require('aws-sdk')
const notifyCFN = require('dev-portal-common/notify-cfn')
const { transact } = require('dev-portal-common/deployment-data')

exports.handler = async (event, context) => {
  try {
    console.log(`Running event ${event.RequestType} for replicator`)

    const execResult = /^(.+)-[^-]+-([^-]+)$/.exec(event.ResourceProperties.Name)
    if (execResult == null) {
      throw new Error(`Unexpected name: ${event.ResourceProperties.Name}`)
    }

    const availableLength = 64 /* max lambda name length */ - 2 /* for dashes */ -
      execResult[1].length - execResult[2].length

    let generatedName = 'CloudFormationEdgeLambda'
    if (generatedName.length > availableLength) generatedName = generatedName.slice(0, availableLength)
    const functionName = `${execResult[1]}-${generatedName}-${execResult[2]}`

    const lambdaEdge = new AWS.Lambda({ apiVersion: '2015-03-31', region: 'us-east-1' })

    if (event.RequestType === 'Create' || event.RequestType === 'Update') {
      console.log('Creating zip archive')
      const archive = archiver('zip')
      const zipPromise = (async () => {
        const output = new PassThrough()
        archive.pipe(output)
        archive.on('error', e => { output.emit('error', e) })
        const codeBuffer = []
        for await (const data of output) codeBuffer.push(data)
        return Buffer.concat(codeBuffer)
      })()

      archive.file(path.resolve(__dirname, 'index.js'), { name: 'index.js' })

      await archive.finalize()
      const zipped = await zipPromise

      console.log('Zip file created')

      let versionResult

      if (event.RequestType === 'Create') {
        console.log('Creating function')
        const createResult = await lambdaEdge.createFunction({
          Code: {
            ZipFile: zipped
          },
          Description: '',
          FunctionName: functionName,
          Handler: 'index.handler',
          MemorySize: 128,
          Role: event.ResourceProperties.RoleArn,
          Runtime: 'nodejs16.x',
          Timeout: 1
        }).promise()
        await lambdaEdge.waitFor('functionExists', { FunctionName: functionName }).promise()
        await lambdaEdge.waitFor('functionActive', { FunctionName: functionName, $waiter: { delay: 2, maxAttempts: 5 } }).promise()
        console.log('Publishing initial version')
        versionResult = await lambdaEdge.publishVersion({
          FunctionName: createResult.FunctionArn
        }).promise()
      } else {
        console.log('Updating function and publishing new version')
        versionResult = await lambdaEdge.updateFunctionCode({
          ZipFile: zipped,
          FunctionName: functionName,
          Publish: true
        }).promise()
        await lambdaEdge.waitFor('functionUpdated', { FunctionName: functionName }).promise()
      }

      console.log('Saving to S3')
      await transact({
        type: 'linkEdge',
        name: event.ResourceProperties.Name,
        newArn: functionName
      })

      console.log('Notifying CFN')
      return notifyCFN.ofSuccess({
        event,
        context,
        physicalResourceId: functionName,
        responseData: { EdgeArn: versionResult.FunctionArn }
      })
    } else {
      console.log('No action required (deletion must be done manually)')
      console.log('Notifying CFN')
      return notifyCFN.ofSuccess({ event, context, physicalResourceId: functionName })
    }
  } catch (e) {
    console.error('Error occurred:', e)
    return notifyCFN.ofFailure({ event, context, error: e })
  }
}
