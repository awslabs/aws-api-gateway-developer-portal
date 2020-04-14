'use strict'

const { p, run } = require('./internal/util')

function visit (folder) {
  return run('npm', process.argv.slice(2), {
    action: 'Execution',
    target: `/${folder}`,
    cwd: p(folder)
  })
}

visit('')
  .then(() => visit('dev-portal'))
  .then(() => visit('lambdas/backend'))
  .then(() => visit('lambdas/catalog-updater'))
  .then(() => visit('lambdas/listener'))
  .then(() => visit('lambdas/static-asset-uploader'))
