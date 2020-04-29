'use strict'

const path = require('path')

if (process.env.DEPLOYER_CONFIG) {
  module.exports = require(path.resolve(process.env.DEPLOYER_CONFIG))
} else if (process.env.TRAVIS) {
  // Don't attempt to load anything in Travis.
} else {
  module.exports = require('../../dev-portal/deployer.config.js')
}
