'use strict'

const path = require('path')
const cp = require('child_process')
const { inspect, promisify } = require('util')

const root = path.resolve(__dirname, '../..')

const red = (text) => { return '\x1b[31m' + text + '\x1b[0m' }
const blue = (text) => { return '\x1b[34m' + text + '\x1b[0m' }
const green = (text) => { return '\x1b[32m' + text + '\x1b[0m' }
const yellow = (text) => { return '\x1b[33m' + text + '\x1b[0m' }

async function execPipe (name, args = []) {
  console.error(blue('[ run cmd ]  ' + [name, ...args].join(' ')))
  const result = await promisify(cp.execFile)(name, args, { stdio: ['inherit', 'pipe', 'inherit'] })
  return result.stdout
}

const exec = (name, args = [], opts = {}) => new Promise(resolve => {
  console.error(blue('[ run cmd ]  ' + [name, ...args].join(' ')))
  cp.spawn(name, args, { stdio: 'inherit', cwd: root, ...opts })
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
  console.error(green(`${action} for `) + blue(target) + green(' started'))
  const result = await exec(name, args, opts)

  if (result.error != null) {
    console.error(red(`${action} for ${target} errored\n${inspect(result.error, { colors: true })}`))
    return false
  } else {
    console.error(
      green(`${action} for `) + blue(target) + green(' completed') +
      computeExtra(result)
    )
    return result.status === 0
  }
}

const p = relative => path.join(root, relative)

module.exports = {
  red,
  blue,
  green,
  yellow,
  execPipe,
  exec,
  run,
  p
}
