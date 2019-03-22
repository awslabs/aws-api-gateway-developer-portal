const { spawn, spawnSync } = require('child_process'),
    path = require('path'),
    convert = require('xml-js'),
    fse = require('fs-extra')

// output with color, even in CI mode & through pipes
process.env.FORCE_COLOR = true

function formatLine(line) {
    // add the leftmost pipe (jest is missing it) and also pad with a space or hyphen, as appropriate
    return line[0] === '-' ? '|-' + line + '\n' : '| ' + line + '\n'
}

function augmentChildProcess(childProcess, withCoverage) {
    return new Promise((resolve, reject) => {
        let table = '',
            errors = []

        if(withCoverage) {
            let isInTable = false

            childProcess.stdout.on('data', (data) => {
                // data can be either one line, or a bunch of lines
                // we need to process them line by line, so let's split them up here
                let lines = data.toString().split('\n').slice(0, -1)

                for(let line of lines) {
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
                reject({
                    message: errors.join('\n'),
                    code: code
                })
            } else {
                resolve(table)
            }
        })
    })
}

function testLambdas(withCoverage) {
    let params = { stdio: withCoverage ? undefined : 'inherit', shell: true, cwd: path.join(process.cwd(), 'lambdas') },
        unitString = 'CI=true jest',
        coverageString = 'jest --coverage'
    return augmentChildProcess(spawn(withCoverage ? coverageString : unitString, params), withCoverage)
}

function testDevPortal(withCoverage) {
    let params = { stdio: withCoverage ? undefined : 'inherit', shell: true, cwd: path.join(process.cwd(), 'dev-portal') },
        unitString = 'CI=true ./node_modules/.bin/react-scripts test',
        coverageString = './node_modules/.bin/react-scripts test --coverage'
    return augmentChildProcess(spawn(withCoverage ? coverageString : unitString, params), withCoverage)
}

function bufferToCoverageObject(fileBodyBuffer) {
    let lambdaCoverage = JSON.parse(convert.xml2json(fileBodyBuffer.toString(), { compact: true })),
        result = {}

    Object.keys(lambdaCoverage.coverage.project.metrics._attributes).forEach((key) => {
        result[key] = parseInt(lambdaCoverage.coverage.project.metrics._attributes[key], 10)
    })

    return result
}

async function synthesizeCoverage() {
    let lambdaCoveragePromise =
        fse.readFile(path.join(process.cwd(), 'lambdas', 'coverage', 'clover.xml'))
            .then(bufferToCoverageObject),
    devPortalCoveragePromise =
        fse.readFile(path.join(process.cwd(), 'dev-portal', 'coverage', 'clover.xml'))
            .then(bufferToCoverageObject)

    return Promise.all([lambdaCoveragePromise, devPortalCoveragePromise])
        .then((results) => {
            let finalResults = {}

            Object.keys(results[0]).forEach((key) => {
                finalResults[key] = results.reduce((accumulator, object) => accumulator + parseInt(object[key], 10), 0)
            })

            return {
                lambdas: results[0],
                devPortal: results[1],
                overall: finalResults
            }
        })
}

function formatCoverageItem(coverage, itemName) {
    return (coverage['covered' + itemName] / coverage[itemName] * 100).toFixed(2).padStart(5 - itemName.length + 12) + '%'
}

function processCoverage(coverage) {
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

function handleError(error) {
    console.error(error.message)
    process.exit(error.code)
}

async function runTests(withCoverage) {
    let promises = []
    promises.push(testLambdas(withCoverage).then(console.log))
    promises.push(testDevPortal(withCoverage).then(console.log))
    await Promise.all(promises).catch(handleError)

    if(withCoverage) processCoverage(await synthesizeCoverage())
}

function runIntegTests() {
    let params = { stdio: 'inherit', shell: true, cwd: process.cwd() }

    // run the tests with 4 worker threads so the 40 minute-long test runs run in parallel
    // increase this as tests are added, if needed
    for(let region of ['us-east-1', 'us-west-2']) {
        spawnSync(`sam package --region ${region} --template-file ./cloudformation/template.yaml --output-template-file ./cloudformation/packaged-${region}.yaml --s3-bucket dev-portal-integ-${region}`, params)
    }

    return spawnSync('jest -w 4 cfn-integration-test', params)
}

// maybe bring in an args parsing library later
let args = process.argv.slice(2)
if(args[0] === '--coverage=true') {
    return runTests(true).catch((e) => console.error(e))
} else if(args[0] === '--coverage=false') {
    return runTests(false).catch((e) => console.error(e))
} else if(args[0] === '--integ=true'){
    return runIntegTests()
} else {
    return runTests(false).catch((e) => console.error(e))
}