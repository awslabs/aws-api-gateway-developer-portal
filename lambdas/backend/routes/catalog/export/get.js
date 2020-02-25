'use strict'

const Datauri = require('datauri')
const catalog = require('../../../catalog/index')
const { getCognitoIdentityId, apigateway } = require('../../../util')

function findApiInCatalog (restApiId, stageName, catalog) {
  for (const usagePlan of catalog.apiGateway) {
    for (const api of usagePlan.apis) {
      if (api.id === restApiId && api.stage === stageName) return api
    }
  }

  for (const api of Object.values(catalog.generic)) {
    if (api.id === restApiId && api.stage === stageName) return api
  }

  return null
}

module.exports = async function getExport (req, res) {
  console.log(`GET /catalog/${req.params.id}/api for Cognito ID: ${getCognitoIdentityId(req)}`)

  // note that we only return an SDK if the API is in the catalog
  // this is important because the lambda function has permission to fetch any API's SDK
  // we don't want to leak customer API shapes if they have privileged APIs not in the catalog
  const [restApiId, stageName] = req.params.id.split('_')
  const catalogObject = findApiInCatalog(restApiId, stageName, await catalog())

  if (!catalogObject) {
    res.status(400).json({ message: `API with ID (${restApiId}) and Stage (${stageName}) could not be found.` })
  } else if (!catalogObject.sdkGeneration) {
    res.status(400).json({ message: `API with ID (${restApiId}) and Stage (${stageName}) is not enabled for SDK generation.` })
  } else {
    let parameters = req.query.parameters
    if (typeof parameters === 'string') {
      try { parameters = JSON.parse(parameters) } catch (e) {
        return res.status(400).json({ message: `Input parameters for API with ID (${restApiId}) and Stage (${stageName}) were a string, but not parsable JSON: ${parameters}` })
      }
    }
    console.log(req.query.parameters)
    console.log(parameters)
    const resultsBuffer = (await apigateway.getExport({
      restApiId,
      exportType: req.query.exportType,
      stageName,
      parameters
    }).promise()).body

    const datauri = new Datauri()
    datauri.format('.zip', resultsBuffer)

    res.send(datauri.content)
  }
}
