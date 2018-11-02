// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const util = require('util');
const writeFile = util.promisify(require('fs').writeFile)

const { execute, r } = require('./utils.js')

const buildConfig = require('../deployer.config.js')
let stackName = buildConfig.stackName

function writeConfig (swallowOutput) {
  return execute(`aws cloudformation describe-stack-resources --stack-name ${stackName}`, swallowOutput)
  .then((result) => {
    let configData = {}

    JSON.parse(result.stdout).StackResources.forEach(output => {
      switch (output.LogicalResourceId) {
        case 'ApiGatewayApi':
          return configData.restApiId = output.PhysicalResourceId
        case 'CognitoUserPool':
          return configData.userPoolId = output.PhysicalResourceId
        case 'CognitoIdentityPool':
          return configData.identityPoolId = output.PhysicalResourceId
        case 'CognitoUserPoolClient':
          return configData.userPoolClientId = output.PhysicalResourceId
        default:
          return
        }
    })

    configData.region = outputs[0].StackId.split(':')[3]

    if(!swallowOutput) console.log(JSON.stringify(configData, null, 4))

    let configFile = `window.config = ${JSON.stringify(configData, null, 2)}`
    return writeFile(r(`../public/config.js`), configFile)
  })
  .catch((err) => {
    console.log(err)
  })
}

module.exports = writeConfig