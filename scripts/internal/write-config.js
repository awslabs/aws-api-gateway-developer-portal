// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict'

const { execPipe, p } = require('./util.js')
const deployerConfig = require('./get-deployer-config.js')

module.exports = async () => {
  // Note: these might not necessarily be installed, so they can't be loaded globally.
  const fetch = require('node-fetch')
  const fse = require('fs-extra')

  const result = await execPipe('aws', [
    'cloudformation', 'describe-stacks',
    '--stack-name', deployerConfig.stackName,
    ...(deployerConfig.awsSamCliProfile ? ['--profile', deployerConfig.awsSamCliProfile] : [])
  ])
  const websiteUrl = JSON.parse(result.toString('utf-8')).Stacks[0].Outputs
    .find(output => output.OutputKey === 'WebsiteURL').OutputValue
  const response = await fetch(`${websiteUrl}/config.js`)
  const output = await response.text()
  await fse.writeFile(p('dev-portal/public/config.js'), output, 'utf-8')
}
