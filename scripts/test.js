const { spawn } = require('child_process'),
    path = require('path')

async function runTests(withCoverage) {
    let params = { stdio: 'inherit', shell: true, cwd: path.join(process.cwd(), 'lambdas')}
    console.warn(`CI=true jest ${ withCoverage ? '--coverage' : '' }`)
    spawn(`CI=true jest ${ withCoverage ? '--coverage' : '' }`, params, (err, stdout, stderr) => {

    })

    params = { stdio: 'inherit', shell: true, cwd: path.join(process.cwd(), 'dev-portal') }
    spawn(`CI=true ./node_modules/.bin/react-scripts test ${ withCoverage ? '--coverage' : '' }`, params, (err, stdout, stderr) => {

    })
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

