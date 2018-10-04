const util = require('util');
const exec = util.promisify(require('child_process').exec);
const writeFile = util.promisify(require('fs').writeFile)
const { relative, resolve } = require('path')

const buildConfig = require('../build.config.js')

let r = (path) => relative(process.cwd(), resolve(__dirname, path)) || '.'
let samTemplate = buildConfig.samTemplate || r(`../../cloudformation/template.yaml`)
let packageConfig = buildConfig.packageConfig || r(`../../cloudformation/packaged.yaml`)
let stackName = buildConfig.stackName
let buildAssetsBucket = buildConfig.buildAssetsBucket
let siteAssetsBucket = buildConfig.siteAssetsBucket
let apiAssetsBucket = buildConfig.apiAssetsBucket

let fgRed = "\x1b[31m"
let fgBlue = "\x1b[34m"
let fgGreen = "\x1b[32m"
let fgYellow = "\x1b[33m"
let reset = "\x1b[0m"

function execute(cmd) {
  console.log(fgBlue + '[ run cmd ]  ' + cmd + reset)
  return exec(cmd).then(result => {
    result.stdout && console.log(result.stdout)
    result.stderr && console.log(fgYellow + result.stderr + reset)
    return result
  })
}

function main() {
  Promise.resolve()
    .then(() => execute(`cd ${r(`../`)} && ./node_modules/react-scripts/bin/react-scripts.js build`))
    .then(() => execute(`cp -r ${r(`../build`)} ${r(`../../lambdas/static-asset-uploader`)}`))
    .then(() => execute(`sam package --template-file ${samTemplate} --output-template-file ${packageConfig} --s3-bucket ${buildAssetsBucket}`))
    .then(() => execute(`sam deploy --template-file ${packageConfig} --stack-name ${stackName} --capabilities CAPABILITY_NAMED_IAM --parameter-overrides DevPortalSiteS3BucketName="${siteAssetsBucket}" ArtifactsS3BucketName="${apiAssetsBucket}"`))
    .then(() => execute(`aws cloudformation describe-stacks --stack-name ${stackName}`))
    .then((result) => {
      let config = {}

      JSON.parse(result.stdout).Stacks[0].Outputs.forEach(output => {
        switch (output.OutputKey) {
          case 'ApiId': return config.restApiId = output.OutputValue
          case 'CognitoUserPoolId': return config.userPoolId = output.OutputValue
          case 'CognitoIdentityPoolId': return config.identityPoolId = output.OutputValue
          case 'CognitoUserPoolClientId': return config.userPoolClientId = output.OutputValue
          default: return
        }
      })

      config.region = config.identityPoolId.split(':')[0]
      let configFile = `window.config = ${JSON.stringify(config, null, 2)}`
      return writeFile(r(`../public/config.js`), configFile)
    })
    .then(() => console.log('\n' + fgGreen + 'Process Complete! Run `npm run start` to launch run the dev portal locally.\n' + reset))
    .catch(err => {
      console.log(fgRed)
      console.log(err)
      console.log(reset)
    })
}

if (samTemplate && packageConfig && stackName && buildAssetsBucket && siteAssetsBucket && apiAssetsBucket) {
  main()
} else {
  !samTemplate && console.log('samTemplate must be defined')
  !packageConfig && console.log('packageConfig must be defined')
  !stackName && console.log('stackName must be defined')
  !buildAssetsBucket && console.log('buildAssetsBucket must be defined')
  !siteAssetsBucket && console.log('siteAssetsBucket must be defined')
  !apiAssetsBucket && console.log('apiAssetsBucket must be defined')
}
