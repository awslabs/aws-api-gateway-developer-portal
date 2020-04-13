'use strict'

const path = require('path')
const { spawn } = require('child_process')
const { inspect } = require('util')

const folders = [
  '/',
  '/dev-portal',
  '/lambdas/backend',
  '/lambdas/catalog-updater',
  '/lambdas/listener',
  '/lambdas/static-asset-uploader'
]

async function execute (args) {
  for (const folder of folders) {
    const resolved = path.join(__dirname, '..', folder.slice(1))
    console.error(`\x1b[32mExecuting in folder:\x1b[0m \x1b[34m${folder}\x1b[0m`)
    const { error, status, signal } = await new Promise((resolve, reject) => {
      spawn('npm', args, { cwd: resolved, stdio: 'inherit' })
        .on('exit', (status, signal) => resolve({ status, signal }))
        .on('error', error => resolve({ error }))
    })

    if (error != null) {
      console.error(`\x1b[31mExecution errored in folder: ${folder}`)
      console.error(`${inspect(error, { colors: true })}\x1b[0m`)
    } else {
      console.error(`\x1b[32mExecution completed in folder:\x1b[0m \x1b[34m${folder}\x1b[0m`)
      if (status != null) console.error(`Status: ${status}`)
      if (signal != null) console.error(`Signal: ${signal}`)
    }
  }
}

module.exports = execute
if (require.main === module) execute(process.argv.slice(2))
