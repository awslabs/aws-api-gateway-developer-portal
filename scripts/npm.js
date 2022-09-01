'use strict'

// Note: this *MUST NOT* globally depend on any module installed in `node_modules`, as it could be
// loaded before they're installed.

const { run, packageList } = require('./internal/util')

;(async () => {
  for (const { target, resolved } of packageList) {
    try {
      await run('npm.cmd', process.argv.slice(2), { action: 'Execution', target, cwd: resolved })
    } catch (e) {
      if (typeof e === 'number') process.exitCode = e
      else throw e
    }
  }
})()
