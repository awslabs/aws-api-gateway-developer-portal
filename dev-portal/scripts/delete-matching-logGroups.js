const util = require('util')
const exec = util.promisify(require('child_process').exec)
const readline = require('readline')
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

let filter = process.argv[2]
let logGroups

exec('zsh -li <(echo "aws logs describe-log-groups")', { shell: '/bin/zsh' }).then(({ stdout }) => {
  logGroups = JSON.parse(stdout).logGroups.map(group => group.logGroupName)

  if (filter) {
    // eslint-disable-next-line no-eval
    filter = (new RegExp(eval(filter)))
    logGroups = logGroups.filter(groupName => filter.test(groupName))
  }

  if (logGroups.length) {
    return new Promise(resolve => rl.question(`${logGroups.join('\n')} \n\nAre you sure you want to delete the listed log groups?\n-> `, resolve))
      .then((answer) => {
        rl.close()

        if (answer[0].toLowerCase() === 'y') {
          console.log('\nDeleting...')
          logGroups = logGroups.map(logGroupName => `aws logs delete-log-group --log-group-name ${logGroupName};`).join('\n')

          return exec(`zsh -li <(echo "${logGroups}")`, { shell: '/bin/zsh' })
            .then(() => {
              console.log('\nDelete complete.')
            })
        } else {
          console.log('\nDelete cancelled.')
        }
      })
  } else {
    rl.close()
    console.log(`No Log Groups that match ${filter}`)
  }
})
