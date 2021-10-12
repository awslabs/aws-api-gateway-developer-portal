'use strict'

const { red, blue, green } = require('./color').stderr

module.exports = async tasks => {
  const opts = Object.create(null)
  const proxy = Object.fromEntries(Object.entries(tasks).map(([name, task]) => {
    // Note: this separation is so it's cached even in the event of sync recursion.
    let promise

    return [name, () => {
      if (promise != null) return promise
      let success, failure
      promise = new Promise((resolve, reject) => {
        success = resolve
        failure = reject
      })
      promise.then(
        () => {
          console.error(green('Task completed: ') + blue(name))
        },
        err => {
          console.error(red(`Task errored: ${name}`))
          // Pass `fail` to cause it to fail without also causing an additional error message to
          // display. (Good for if an error message was already displayed previously.)
          if (typeof err === 'number') {
            process.exitCode = err
          } else {
            console.error(red(err.message))
            process.exitCode = 1
          }
        }
      )
      try {
        success(task.call(proxy, opts))
      } catch (e) {
        failure(e)
      }
      return promise
    }]
  }))

  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error()
    console.error(green('Available tasks:'))
    console.error()
    for (const key of Object.keys(proxy)) {
      if (key[0] !== '_') console.error(blue(`  * ${key}`))
    }
    console.error()
  } else {
    const names = args.filter(arg => !arg.startsWith('--') && arg[0] !== '_')

    for (const arg of args) {
      // Ignore color-related flags in options
      if (/^--(?!color|no-color)/.test(arg)) {
        const [key, value] = arg.slice(2).split('=')
        if (value != null) opts[key] = value
      }
    }

    for (const name of names) {
      try {
        await proxy[name](opts)
      } catch (e) {
        // Ignore errors - they're already separately handled above
      }
    }
  }
}
