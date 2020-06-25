'use strict'

// Ideally, I'd use Chalk, but this has to be zero-dependency.
const supportsColor = require('./supports-color')

function makeColor (useColor) {
  return {
    red: str => useColor ? `\x1b[31m${str}\x1b[39m` : `${str}`,
    green: str => useColor ? `\x1b[32m${str}\x1b[39m` : `${str}`,
    yellow: str => useColor ? `\x1b[33m${str}\x1b[39m` : `${str}`,
    blue: str => useColor ? `\x1b[34m${str}\x1b[39m` : `${str}`,
    magenta: str => useColor ? `\x1b[35m${str}\x1b[39m` : `${str}`,
    cyan: str => useColor ? `\x1b[36m${str}\x1b[39m` : `${str}`,
    white: str => useColor ? `\x1b[37m${str}\x1b[39m` : `${str}`
  }
}

module.exports = {
  stdout: makeColor(supportsColor.stdout),
  stderr: makeColor(supportsColor.stderr)
}
