'use strict'

// Note: this *MUST NOT* globally depend on any module installed in `node_modules`, as it could be
// loaded before they're installed.

const { run, packageList } = require('./internal/util')

;(async () => {
  for (const { target, resolved } of packageList) {
    await run('npm', process.argv.slice(2), { action: 'Execution', target, cwd: resolved })
  }
})()
