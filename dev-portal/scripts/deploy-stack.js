// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
'use strict'

const { red, green } = require('./utils.js')

const deployerConfig = require('./get-deployer-config.js')
const writeConfig = require('./write-config.js')
const deployTemplate = require('./deploy-template.js')

async function main() {
  const missing = deployTemplate(deployerConfig)

  if (missing != null) {
    for (const key of missing) console.error(red(key + ' must be defined'))
  } else {
    await writeConfig()
    console.log()
    console.log(green('Process Complete! Run `npm run start` to launch run the dev portal locally.'))
    console.log()
  }
}

main().catch(err => console.error(red(err)))
