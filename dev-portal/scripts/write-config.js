// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const fetch = require('node-fetch')
const writeFile = require('fs').writeFileSync

const { execute, r, red } = require('./utils.js')

const deployerConfig = require('../deployer.config.js')
const stackName = deployerConfig.stackName

// AWS SAM CLI configuration
const awsSamCliProfile = deployerConfig.awsSamCliProfile

async function writeConfig () {
  const result = execute('aws', [
    'cloudformation', 'describe-stacks',
    '--stack-name', stackName,
    ...(awsSamCliProfile ? ['--profile', awsSamCliProfile] : [])
  ])
  const websiteUrl = JSON.parse(result.toString('utf-8')).Stacks[0].Outputs
    .find(output => output.OutputKey === 'WebsiteURL').OutputValue
  const response = await fetch(`${websiteUrl}/config.js`)
  const output = await response.text()
  writeFile(r('../public/config.js'), output, 'utf-8')
}

module.exports = writeConfig

if (require.main === module) {
  writeConfig().catch(err => console.error(red(err)))
}
