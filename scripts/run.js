'use strict'

// Note: this *MUST NOT* globally depend on any module installed in `node_modules`, as it could be
// loaded before they're installed.

const path = require('path')
const { p, run, exec, packageList } = require('./internal/util.js')
const { blue, green } = require('./internal/color').stdout
const deployTemplate = require('./internal/deploy-template.js')
const writeConfig = require('./internal/write-config.js')

function runTask (task, args = []) {
  return run(
    'npm.cmd', ['run', task, '--', ...args],
    { action: 'dev-portal/ task', target: task, cwd: p('dev-portal') }
  )
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

  async reinstall () {
    // Note: this might not necessarily be installed yet, so it can't be loaded globally.
    const fse = require('fs-extra')

    for (const { target, resolved } of packageList) {
      console.log(green('Deleting ') + (target ? blue(target) : green('root')))
      await fse.remove(path.join(resolved, 'node_modules'))
    }

    console.log(green('Preparing dependencies...'))
    // We have the package and distribution bundles here in source control, and these should only
    // be updated with that dependency. (Removing them causes build issues.)
    await exec('git', ['checkout', '--', 'dev-portal/node_modules'])

    await this.install()
  },

  async lint () {
    await exec('eslint')
    await this['cfn-lint']()
  },

  async test (opts) {
    await exec('node', [p('scripts/test'), ...Object.entries(opts).map(p => '--' + p.join('='))], {
      // Output with color, even through pipes.
      // Do proxy existing color support, though.
      env: { ...process.env, FORCE_COLOR: true }
    })
  },

  async build () {
    // Note: this might not necessarily be installed yet, so it can't be loaded globally.
    const fse = require('fs-extra')

    await runTask('build')
    await fse.remove(p('lambdas/static-asset-uploader/build'))
    await fse.copy(p('dev-portal/build'), p('lambdas/static-asset-uploader/build'))
  },

  async deploy () {
    await deployTemplate()
    printReady()
  },

  async release () {
    await this.build()
    await deployTemplate()
    await this['reset-assets']()
    printReady()
  },

  async start () {
    await writeConfig()
    await runTask('start')
  },

  async 'reset-assets' () {
    await exec('git', ['checkout', '--force', '--', 'lambdas/static-asset-uploader/build'])
    await exec('git', ['clean', '-d', '--force', '--', 'lambdas/static-asset-uploader/build'])
  },

  async 'cfn-lint' () {
    await exec('cfn-lint')
  },

  async 'version' ({ inc: increment, type }) {
    if (increment == null) {
      throw new TypeError('Increment is required')
    }

    if (!/^(?:patch|minor|major|prepatch|preminor|premajor|prerelease)$/.test(increment)) {
      throw new TypeError('Increment is invalid')
    }

    // Note: this might not necessarily be installed yet, so it can't be loaded globally.
    const fs = require('fs-extra')
    const inc = require('semver/functions/inc')

    await this.build()

    console.log(green('Updating "version" field in ') + blue('package.json'))
    const rootPkg = JSON.parse(await fs.readFile(p('package.json'), 'utf-8'))
    const newVersion = inc(rootPkg.version, increment, type)

    async function updatePackage (resolved, target) {
      console.log(green('Updating "version" field in ') + blue(target))
      const pkg = JSON.parse(await fs.readFile(resolved, 'utf-8'))
      pkg.version = newVersion
      fs.writeFile(resolved, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
    }

    rootPkg.version = newVersion

    await Promise.all([
      fs.writeFile(p('package.json'), JSON.stringify(rootPkg, null, 2) + '\n', 'utf-8'),
      updatePackage(p('package-lock.json'), 'package-lock.json'),
      fs.readFile(p('cloudformation/template.yaml'), { encoding: 'utf-8' })
        .then(content => content.replace(
          /\/version\/{v\d+_\d+_\d+}:/g,
          `/version/{v${newVersion.replace(/\./g, '_')}}:`
        ))
        .then(replaced => fs.writeFile(p('cloudformation/template.yaml'), replaced, { encoding: 'utf-8' })),
      ...packageList
        .filter(p => p.target !== '')
        .map(async ({ target, resolved }) => Promise.all([
          updatePackage(path.join(resolved, 'package.json'), path.join(target, 'package.json')),
          updatePackage(path.join(resolved, 'package-lock.json'), path.join(target, 'package-lock.json'))
        ]))
    ])

    console.log(green('Committing updated packages'))

    await exec('git', [
      'add',
      p('cloudformation/template.yaml'),
      p('lambdas/static-asset-uploader/build'),
      ...(
        await Promise.all(
          packageList
            .map(p => path.join(p.target, 'node_modules'))
            .map(f => fs.access(f, fs.constants.R_OK).catch(() => null))
        )
      ).filter(f => f != null),
      ...packageList.map(p => path.join(p.target, 'package.json')),
      ...packageList.map(p => path.join(p.target, 'package-lock.json'))
    ])

    await exec('git', ['commit', '--message', `v${newVersion}`])
    await exec('git', ['tag', `v${newVersion}`])

    console.log(green('Release tag created: ') + blue(`v${newVersion}`))
  }
})
