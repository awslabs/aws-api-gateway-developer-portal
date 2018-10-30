// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const util = require('util');
const writeFile = util.promisify(require('fs').writeFile)

const { execute, r } = require('./utils.js')

const buildConfig = require('../deployer.config.js')
let stackName = buildConfig.stackName

function writeConfig (swallowOutput) {
  return execute(`aws cloudformation describe-stacks --stack-name ${stackName}`, swallowOutput)
  .then((result) => {
    let configData = {}

    JSON.parse(result.stdout).Stacks[0].Outputs.forEach(output => {
      switch (output.OutputKey) {
        case 'ApiId': return configData.restApiId = output.OutputValue
        case 'CognitoUserPoolId': return configData.userPoolId = output.OutputValue
        case 'CognitoIdentityPoolId': return configData.identityPoolId = output.OutputValue
        case 'CognitoUserPoolClientId': return configData.userPoolClientId = output.OutputValue
        default: return
      }
    })

    configData.region = configData.identityPoolId.split(':')[0]
    let configFile = `window.config = ${JSON.stringify(configData, null, 2)}`
    return writeFile(r(`../public/config.js`), configFile)
  })
}

module.exports = writeConfig