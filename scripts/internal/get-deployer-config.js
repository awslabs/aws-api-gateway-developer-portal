'use strict'

const path = require('path')

if (process.env.DEPLOYER_CONFIG) {
  module.exports = require(path.resolve(process.env.DEPLOYER_CONFIG))
} else {
  module.exports = require('../../dev-portal/deployer.config.js')
}
