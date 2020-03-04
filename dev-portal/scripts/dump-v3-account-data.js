// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Calls the DumpV3AccountDataFn lambda, and writes its JSON string output into
// a file.

const fs = require('fs')
const os = require('os')
const path = require('path')
const util = require('util')

const { execute } = require('./utils.js')

const fetchLambdaOutput = async ({ stackName, workDir }) => {
  const resourceData = JSON.parse((await execute(
    'aws cloudformation describe-stack-resource' +
    ' --logical-resource-id DumpV3AccountDataFn' +
    ` --stack-name ${stackName}`, true)).stdout)
  const lambdaId = resourceData.StackResourceDetail.PhysicalResourceId
  const outFile = `${workDir}${path.sep}lambdaOut`
  await execute(
    `aws lambda invoke --function-name ${lambdaId} ${outFile}`, true)
  const output = JSON.parse(fs.readFileSync(outFile))
  fs.unlinkSync(outFile)
  return output
}

const main = async () => {
  if (process.argv.length !== 4) {
    const [node, script] = process.argv
    console.error(`Usage: ${node} ${script} STACK_NAME OUTPUT_FILE`)
    process.exitCode = 127
    return
  }
  const [,, stackName, outFile] = process.argv

  const workDir = await util.promisify(fs.mkdtemp)(os.tmpdir() + path.sep)
    .catch(error => {
      throw new Error(`Failed to create temp directory: ${error.message}`)
    })

  console.log(`Fetching account data from stack ${stackName}...`)
  const lambdaOutput = await fetchLambdaOutput({ stackName, workDir })
    .catch(error => {
      throw new Error(`Failed to fetch account data: ${error.message}`)
    }).finally(() => fs.rmdirSync(workDir))

  console.log(`Writing account data to ${outFile}...`)
  try {
    fs.writeFileSync(outFile, lambdaOutput)
  } catch (error) {
    throw new Error(`Failed to write to ${outFile}: ${error.message}`)
  }

  console.log('Done.')
}

if (!module.parent) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
