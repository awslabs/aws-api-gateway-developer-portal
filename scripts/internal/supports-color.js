/**
 * The following copyright applies to most of this file:
 *
 * @license MIT
 * MIT License
 *
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Some alterations were made for style, some were made to simplify it, and a few were made to remove a dependency. The build system has a hard requirement that it works prior to npm dependencies being installed, hence why this was brought into the project.
 */
'use strict'
const tty = require('tty')

const terminatorPosition = process.argv.indexOf('--')

function hasFlag (flag) {
  const position = process.argv.indexOf(flag)
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition)
}

const { env } = process

let forceColor
if (hasFlag('--no-color') ||
  hasFlag('--no-colors') ||
  hasFlag('--color=false') ||
  hasFlag('--color=never')) {
  forceColor = false
} else if (hasFlag('--color') ||
  hasFlag('--colors') ||
  hasFlag('--color=true') ||
  hasFlag('--color=always')) {
  forceColor = true
}

if ('FORCE_COLOR' in env) {
  if (env.FORCE_COLOR === 'true') {
    forceColor = true
  } else if (env.FORCE_COLOR === 'false') {
    forceColor = false
  } else {
    forceColor = env.FORCE_COLOR.length === 0 ? true : Boolean(parseInt(env.FORCE_COLOR, 10))
  }
}

function supportsColor (streamIsTTY) {
  if (forceColor === false) {
    return false
  }

  if (hasFlag('--color=16m') ||
    hasFlag('--color=full') ||
    hasFlag('--color=truecolor')) {
    return true
  }

  if (hasFlag('--color=256')) {
    return true
  }

  if (!streamIsTTY && forceColor === undefined) {
    return false
  }

  const min = forceColor || false

  if (env.TERM === 'dumb') {
    return min
  }

  if (process.platform === 'win32') {
    return true
  }

  if ('CI' in env) {
    if (
      ['CIRCLECI', 'APPVEYOR', 'GITLAB_CI', 'GITHUB_ACTIONS'].some(sign => sign in env) ||
        env.CI_NAME === 'codeship'
    ) {
      return true
    }

    return min
  }

  if ('TEAMCITY_VERSION' in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION)
  }

  if (env.COLORTERM === 'truecolor') {
    return true
  }

  if ('TERM_PROGRAM' in env) {
    switch (env.TERM_PROGRAM) {
      case 'iTerm.app':
      case 'Apple_Terminal':
        return true
      // No default
    }
  }

  if (/-256(color)?$/i.test(env.TERM)) {
    return true
  }

  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return true
  }

  if ('COLORTERM' in env) {
    return true
  }

  return min
}

module.exports = {
  stdout: supportsColor(tty.isatty(1)),
  stderr: supportsColor(tty.isatty(2))
}
