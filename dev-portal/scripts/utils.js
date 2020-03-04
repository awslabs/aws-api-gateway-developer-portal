// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const { relative, resolve } = require('path')
const execFile = require('child_process').execFileSync

function execute (cmd, args = []) {
  console.log(blue('[ run cmd ]  ' + [cmd, ...args].join(' ')))
  return execFile(cmd, args, { stdio: 'pipe' })
}

const r = (path) => relative(process.cwd(), resolve(__dirname, path)) || '.'

const red = (text) => { return '\x1b[31m' + text + '\x1b[0m' }
const blue = (text) => { return '\x1b[34m' + text + '\x1b[0m' }
const green = (text) => { return '\x1b[32m' + text + '\x1b[0m' }
const yellow = (text) => { return '\x1b[33m' + text + '\x1b[0m' }

module.exports = {
  execute,
  r,
  red,
  blue,
  green,
  yellow
}
