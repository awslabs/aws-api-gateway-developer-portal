// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const util = require('util');
const fetch = require('node-fetch')
const writeFile = util.promisify(require('fs').writeFile)

const { execute, r } = require('./utils.js')

const buildConfig = require('../deployer.config.js')
const stackName = buildConfig.stackName

function writeConfig (swallowOutput) {
  return execute(`aws cloudformation describe-stacks --stack-name ${stackName}`, swallowOutput)
  .then((result) => {
    const websiteUrl = (JSON.parse(result.stdout).Stacks[0].Outputs)
      .find(output => output.OutputKey === "WebsiteURL").OutputValue

    return fetch(`${websiteUrl}/config.js`).then(response => response.text())
  })
  .then(output => writeFile(r(`../public/config.js`), output))
  .catch(console.error)
}

module.exports = writeConfig