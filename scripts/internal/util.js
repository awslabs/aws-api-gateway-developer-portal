'use strict'

// Note: this *MUST NOT* globally depend on any module installed in `node_modules`, as it could be
// loaded before they're installed.

const path = require('path')
const cp = require('child_process')
const { inspect, promisify } = require('util')
const { red, blue, green } = require('./color').stderr

const root = path.resolve(__dirname, '../..')

async function execPipe (name, args = []) {
  console.error(blue('[ run cmd ]  ' + [name, ...args].join(' ')))
  const result = await promisify(cp.execFile)(name, args, { stdio: ['inherit', 'pipe', 'inherit'] })
  return result.stdout
}

const exec = (name, args = [], opts = {}) => new Promise(resolve => {
  console.error(blue('[ run cmd ]  ' + [name, ...args].join(' ')))
  cp.spawn(name, args, { stdio: 'inherit', cwd: root, shell: true, ...opts })
    .on('exit', (status, signal) => resolve({ status, signal }))
    .on('error', error => resolve({ error }))
})

function computeExtra ({ status, signal }) {
  if (status > 0 && signal != null) {
    return green(' (code: ') + blue(status) + green(', signal: ') + blue(signal) + green(')')
  } else if (status > 0) {
    return green(' (code: ') + blue(status) + green(')')
  } else if (signal != null) {
    return green(' (signal: ') + blue(signal) + green(')')
  } else {
    return ''
  }
}

async function run (name, args, { action, target, ...opts }) {
  console.error(green(`${action} for `) + (target ? blue(target) : green('root')) + green(' started'))
  const result = await exec(name, args, opts)

  if (result.error != null) {
    console.error(red(`${action} for ${target || 'root'} errored\n${inspect(result.error, { colors: true })}`))
    // eslint-disable-next-line no-throw-literal
    throw 1
  } else {
    console.error(
      green(`${action} for `) + (target ? blue(target) : green('root')) + green(' completed') +
      computeExtra(result)
    )
    if (result.status) throw result.status
  }
}

const p = relative => path.join(root, relative)

const packageList = [
  '',
  'dev-portal',
  'lambdas/backend',
  'lambdas/catalog-updater',
  'lambdas/cloudfront-security',
  'lambdas/static-asset-uploader'
].map(rel => ({
  target: rel,
  resolved: p(rel)
}))

module.exports = {
  execPipe,
  exec,
  run,
  p,
  packageList
}
