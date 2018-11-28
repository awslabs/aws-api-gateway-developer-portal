const { spawn } = require('child_process'),
    path = require('path'),
    convert = require('xml-js'),
    fse = require('fs-extra')

// output with color, even in CI mode & through pipes
process.env.FORCE_COLOR = true

function augmentChildProcess(child, withCoverage) {
    return new Promise((resolve, reject) => {
        let table = '',
            errors = []

        if(withCoverage) {
            let isInTable = false

            child.stdout.on('data', (data) => {
                data = data.toString()
                if (!isInTable && data && data.match(/(-+\|)+/)) {
                    // when we enter the table, mark that we're in the table and record that line
                    isInTable = true
                    table += data
                } else if (isInTable && data && !data.match(/Test Suites: /)) {
                    // while we're in the table, record all lines
                    table += data
                } else if (isInTable && data && data.match(/Test Suites: /)) {
                    // when we exit the table, mark that we're outside the table
                    isInTable = false
                }
                // ignore all other lines
            })

            child.stderr.on('data', (data) => {
                errors.push(data)
            })
        }


        child.on('close', (code) => {
            if (code !== 0) {
                reject(errors.join('\n'))
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

async function runTests(withCoverage) {
    let promises = []
    promises.push(testLambdas(withCoverage).then(console.log))
    promises.push(testDevPortal(withCoverage).then(console.log))
    await Promise.all(promises)

    if(withCoverage) processCoverage(await synthesizeCoverage())
}

// maybe bring in an args parsing library later
let args = process.argv.slice(2)
if(args[0] === '--coverage=true') {
    return runTests(true).catch((e) => console.error(e))
} else if(args[0] === '--coverage=false') {
    return runTests(false).catch((e) => console.error(e))
} else {
    return runTests(false).catch((e) => console.error(e))
}