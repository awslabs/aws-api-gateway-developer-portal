const yaml = require('js-yaml')
const fs = require('fs')

// Load Swagger as JSON
// const petStoreSwaggerDefinition = require('./pet-store-prod.json')

// Load Swagger as YAML
const petStoreSwaggerDefinition = loadYaml('./pet-store-prod.yaml')

const usagePlans = [{
  id: 'YOUR_USAGE_PLAN_ID',
  name: 'Free',
  apis: [{
    id: 'YOUR_API_ID',
    image: '/sam-logo.png',
    swagger: petStoreSwaggerDefinition
  }]
}]

module.exports = usagePlans

function loadYaml (path) {
  try {
      return yaml.safeLoad(fs.readFileSync(`${__dirname}/${path}`, 'utf8'))
  } catch (e) {
      console.log(e)
  }
}
