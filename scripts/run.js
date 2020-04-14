'use strict'

const { p, run, exec, green } = require('./internal/util.js')
const deployTemplate = require('./internal/deploy-template.js')
const writeConfig = require('./internal/write-config.js')

function runTask (task, args = []) {
  return run(
    'npm', ['run', task, '--', ...args],
    { action: '/dev-portal/ task', target: task, cwd: p('dev-portal') }
  )
}

async function deploy () {
  const missing = await deployTemplate()
  if (missing != null) throw new Error(missing.map(key => key + ' must be defined').join('\n'))
}

function printReady () {
  console.log()
  console.log(green('Process Complete! Run `node run start` to launch run the dev portal locally.'))
  console.log()
}

require('./internal/execute-tasks.js')({
  async install () {
    await exec('node', [p('scripts/npm'), 'install'])
  },

  async lint () {
    await exec('eslint')
    await this['cfn-lint']()
  },

  async test (opts) {
    await exec('node', [p('scripts/test'), ...Object.entries(opts).map(p => '--' + p.join('='))])
  },

  async build () {
    // Note: this might not necessarily be installed yet, so it can't be loaded globally.
    const fse = require('fs-extra')

    await runTask('build')
    await fse.remove(p('lambdas/static-asset-uploader/build'))
    await fse.copy(p('dev-portal/build'), p('lambdas/static-asset-uploader/build'))
  },

  async deploy () {
    await deploy()
    printReady()
  },

  async release () {
    await this.build()
    await deploy()
    await this['reset-assets']()
    printReady()
  },

  async start () {
    await writeConfig()
    await runTask('start')
  },

  async 'reset-assets' () {
    await exec('git', ['checkout', '--force', '--', 'lambdas/static-asset-uploader/build'])
  },

  async 'cfn-lint' () {
    await exec('cfn-lint')
  }
})
