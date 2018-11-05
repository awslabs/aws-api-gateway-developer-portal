// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const util = require('util');
const writeFile = util.promisify(require('fs').writeFile)

const { execute, r } = require('./utils.js')

const buildConfig = require('../deployer.config.js')
const stackName = buildConfig.stackName

function writeConfig (swallowOutput) {
  return execute(`aws cloudformation describe-stack-resources --stack-name ${stackName}`, swallowOutput)
  .then((result) => {
    const configData = {}
    const responseToJSON = JSON.parse(result.stdout)
    const resources = responseToJSON.StackResources

    configData.region = resources[0].StackId.split(':')[3]

    resources.forEach(resource => {
      switch (resource.LogicalResourceId) {
        case 'ApiGatewayApi':
          return configData.restApiId = resource.PhysicalResourceId
        case 'CognitoUserPool':
          return configData.userPoolId = resource.PhysicalResourceId
        case 'CognitoIdentityPool':
          return configData.identityPoolId = resource.PhysicalResourceId
        case 'CognitoUserPoolClient':
          return configData.userPoolClientId = resource.PhysicalResourceId
        default:
          return
        }
    })

    if(!swallowOutput) console.log(JSON.stringify(configData, null, 4))

    const configFile = `window.config = ${JSON.stringify(configData, null, 2)}`
    return writeFile(r(`../public/config.js`), configFile)
  })
  .catch((err) => {
    console.log(err)
  })
}

module.exports = writeConfig