'use strict'

const { spawn, spawnSync } = require('child_process')
const path = require('path')
const convert = require('xml-js')
const fs = require('fs')

// output with color, even in CI mode & through pipes
process.env.FORCE_COLOR = true

function formatLine (line) {
  // add the leftmost pipe (jest is missing it) and also pad with a space or hyphen, as appropriate
  return line[0] === '-' ? '|-' + line + '\n' : '| ' + line + '\n'
}

function readFile (...args) {
  return new Promise((resolve, reject) => {
    fs.readFile(...args, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

function augmentChildProcess (childProcess, withCoverage) {
  return new Promise((resolve, reject) => {
    let table = ''
    const errors = []

    if (withCoverage) {
      let isInTable = false

      childProcess.stdout.on('data', (data) => {
        // data can be either one line, or a bunch of lines
        // we need to process them line by line, so let's split them up here
        const lines = data.toString().split('\n').slice(0, -1)

        for (let line of lines) {
          // the table is missing the leftmost pipe, so we add it here
          line = formatLine(line)
          if (!isInTable && line && line.match(/^\|(-+\|)+/)) {
            // when we enter the table, mark that we're in the table and record that line
            isInTable = true
            table += line
          } else if (isInTable && line && !line.match(/Test Suites: /)) {
            // while we're in the table, record all lines
            table += line
          } else if (isInTable && line && line.match(/Test Suites: /)) {
            // when we exit the table, mark that we're outside the table
            isInTable = false
          }
        }

        // ignore all other lines
      })

      childProcess.stderr.on('data', (data) => {
        errors.push(data)
      })
    }

    childProcess.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(errors.join('\n'))
        error.code = code
        reject(error)
      } else {
        resolve(table)
      }
    })
  })
}

function testLambdas (withCoverage) {
  const params = { stdio: withCoverage ? undefined : 'inherit', shell: true, cwd: path.join(process.cwd(), 'lambdas') }
  const unitString = 'CI=true jest'
  const coverageString = 'jest --coverage'
  return augmentChildProcess(spawn(withCoverage ? coverageString : unitString, params), withCoverage)
}

function testDevPortal (withCoverage) {
  const params = { stdio: withCoverage ? undefined : 'inherit', shell: true, cwd: path.join(process.cwd(), 'dev-portal') }
  const unitString = 'CI=true ./node_modules/.bin/react-scripts test'
  const coverageString = './node_modules/.bin/react-scripts test --coverage'
  return augmentChildProcess(spawn(withCoverage ? coverageString : unitString, params), withCoverage)
}

function bufferToCoverageObject (fileBodyBuffer) {
  const lambdaCoverage = JSON.parse(convert.xml2json(fileBodyBuffer.toString(), { compact: true }))
  const result = {}

  Object.keys(lambdaCoverage.coverage.project.metrics._attributes).forEach((key) => {
    result[key] = parseInt(lambdaCoverage.coverage.project.metrics._attributes[key], 10)
  })

  return result
}

async function synthesizeCoverage () {
  const [lambdas, devPortal] = await Promise.all([
    readFile(path.resolve('lambdas/coverage/clover.xml')).then(bufferToCoverageObject),
    readFile(path.resolve('dev-portal/coverage/clover.xml')).then(bufferToCoverageObject)
  ])
  const overall = {}

  Object.keys(lambdas).forEach((key) => {
    overall[key] = parseInt(lambdas[key], 10) + parseInt(devPortal[key], 10)
  })

  return { lambdas, devPortal, overall }
}

function formatCoverageItem (coverage, itemName) {
  return (coverage['covered' + itemName] / coverage[itemName] * 100).toFixed(2).padStart(5 - itemName.length + 12) + '%'
}

function processCoverage (coverage) {
  console.log('Lambdas:')
  console.log(`    Statements: ${formatCoverageItem(coverage.lambdas, 'statements')}`)
  console.log(`    Conditionals: ${formatCoverageItem(coverage.lambdas, 'conditionals')}`)
  console.log(`    Methods: ${formatCoverageItem(coverage.lambdas, 'methods')}`)
  console.log(`    Elements: ${formatCoverageItem(coverage.lambdas, 'elements')}`)

  console.log('Dev Portal:')
  console.log(`    Statements: ${formatCoverageItem(coverage.devPortal, 'statements')}`)
  console.log(`    Conditionals: ${formatCoverageItem(coverage.devPortal, 'conditionals')}`)
  console.log(`    Methods: ${formatCoverageItem(coverage.devPortal, 'methods')}`)
  console.log(`    Elements: ${formatCoverageItem(coverage.devPortal, 'elements')}`)

  console.log('Overall:')
  console.log(`    Statements: ${formatCoverageItem(coverage.overall, 'statements')}`)
  console.log(`    Conditionals: ${formatCoverageItem(coverage.overall, 'conditionals')}`)
  console.log(`    Methods: ${formatCoverageItem(coverage.overall, 'methods')}`)
  console.log(`    Elements: ${formatCoverageItem(coverage.overall, 'elements')}`)
}

async function runTests (withCoverage) {
  await Promise.all([
    testLambdas(withCoverage).then(console.log),
    testDevPortal(withCoverage).then(console.log)
  ])

  if (withCoverage) processCoverage(await synthesizeCoverage())
}

function runIntegTests () {
  const params = { stdio: 'inherit', shell: true, cwd: process.cwd() }

  // run the tests with 4 worker threads so the 40 minute-long test runs run in parallel
  // increase this as tests are added, if needed
  for (const region of ['us-east-1', 'us-west-2']) {
    spawnSync(`sam package --region ${region} --template-file ./cloudformation/template.yaml --output-template-file ./cloudformation/packaged-${region}.yaml --s3-bucket dev-portal-integ-${region}`, params)
  }

  return spawnSync('jest -w 4 cfn-integration-test', params)
}

// maybe bring in an args parsing library later
const args = process.argv.slice(2)
if (args[0] === '--coverage=true') {
  runTests(true).catch((e) => console.error(e))
} else if (args[0] === '--coverage=false') {
  runTests(false).catch((e) => console.error(e))
} else if (args[0] === '--integ=true') {
  runIntegTests()
} else {
  runTests(false).catch((e) => console.error(e))
}
