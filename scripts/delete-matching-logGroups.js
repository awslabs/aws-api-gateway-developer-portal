'use strict'

const util = require('util')
const exec = util.promisify(require('child_process').exec)
const readline = require('readline')
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const { execPipe } = require('./internal/util.js')

const filter = process.argv[2]

;(async () => {
  const logGroups = JSON.parse(
    await execPipe('aws', ['logs', 'describe-log-groups'], {
      stdio: ['inherit', 'pipe', 'inherit']
    })
  )
    .logGroups.map(group => group.logGroupName)

  if (filter) {
    // eslint-disable-next-line no-eval
    const matcher = new RegExp(filter)

    let count = 0
    for (let i = 0; i < logGroups.length; i++) {
      if (matcher.test(logGroups[i])) {
        logGroups[count++] = logGroups[i]
      }
    }
    logGroups.length = count
  }

  if (!logGroups.length) {
    rl.close()
    console.log(`No Log Groups that match ${filter}`)
    return
  }

  const answer = await new Promise(resolve => {
    rl.question(`${logGroups.join('\n')} \n\nAre you sure you want to delete the listed log groups?\n-> `, resolve)
  })

  rl.close()

  if (answer[0].toLowerCase() === 'y') {
    console.log('\nDeleting...')

    for (const logGroupName of logGroups) {
      await exec('aws', ['logs', 'delete-log-group', '--log-group-name', logGroupName])
    }

    console.log('\nDelete complete.')
  } else {
    console.log('\nDelete cancelled.')
  }
})()
