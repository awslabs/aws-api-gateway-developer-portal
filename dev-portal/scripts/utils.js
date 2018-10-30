// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const util = require('util');
const { relative, resolve } = require('path')
const exec = util.promisify(require('child_process').exec);

function execute(cmd, swallowOutput) {
  console.log(('[ run cmd ]  ' + cmd).blue())
  return exec(cmd).then(result => {
    !swallowOutput && result.stdout && console.log(result.stdout)
    !swallowOutput && result.stderr && console.log(result.stderr.yellow())
    return result
  })
}

const r = (path) => relative(process.cwd(), resolve(__dirname, path)) || '.'

const setToColor = (color) => function() { return color + this + "\x1b[0m" }

String.prototype.red = setToColor("\x1b[31m")  // eslint-disable-line
String.prototype.blue = setToColor("\x1b[34m")  // eslint-disable-line
String.prototype.green = setToColor("\x1b[32m")  // eslint-disable-line
String.prototype.yellow = setToColor("\x1b[33m")  // eslint-disable-line

module.exports = { 
  execute,
  r
}
