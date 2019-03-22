const fs = require('fs')
const rp = require('request-promise')

describe('template.yaml', () => {
    // NOTE: These tests all assume that the CFN template has already been packaged *PER REGION*!
    const cfnTimeout = 75,
          // run the test with a timeout of slightly longer than double the CFN stack timeout
          testTimeout = 1000*60*cfnTimeout*2 + 1
    const _console = console.log

    async function commonTest(region, stackMiddlefix) {
        let unixTimestamp = Math.floor(new Date() / 1000),
            stackName = `cfn-integ-${ stackMiddlefix }-${ unixTimestamp }`,
            s3Params = {
                // CFN, when reading the template from S3, requires the S3 bucket to be in the same region as the CFN stack...
                Bucket: `dev-portal-integ-${ region }`,
                Body: fs.readFileSync(`./cloudformation/packaged-${region}.yaml`),
                Key: stackName
            },
            cfnParams = {
                StackName: stackName,
                Capabilities: ['CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
                Parameters: [
                    {
                        ParameterKey: 'DevPortalSiteS3BucketName',
                        ParameterValue: `integ-${ stackMiddlefix }-${ unixTimestamp }-dev-portal-test`
                    },
                    {
                        ParameterKey: 'ArtifactsS3BucketName',
                        ParameterValue: `integ-${ stackMiddlefix }-${ unixTimestamp }-artifact-bucket`
                    },
                    {
                        ParameterKey: 'DevPortalCustomersTableName',
                        ParameterValue: `Customers${ unixTimestamp }`
                    },
                    {
                        ParameterKey: 'CognitoDomainNameOrPrefix',
                        ParameterValue: `integ-${ stackMiddlefix }-${ unixTimestamp }`
                    }
                ],
                // RoleARN: 'STRING_VALUE',
                TimeoutInMinutes: cfnTimeout
            }

        console.log('commonTest', region)

        const AWS = require('aws-sdk')
        AWS.config.update({ region: region })

        // pin versions of SDKs
        const cfn = new AWS.CloudFormation({ region: region }),
              s3 = new AWS.S3({ region: region }),
              logger = function (input) {
                  _console(`${region}:${stackName}:${input}`)
              }

        // Upload the packaged template to S3, then use the resulting URL in the CFN createStack call
        // This is necessary because the file is too large to deliver in-line to CFN
        cfnParams.TemplateURL =(await s3.upload(s3Params).promise()).Location

        logger('createStack call starting.')
        await cfn.createStack(cfnParams).promise()
        logger('createStack call succeeded.')

        logger('stackExists waiter starting.')
        await cfn.waitFor('stackExists', { StackName: stackName }).promise()
        logger('stackExists waiter succeeded.')

        logger('stackCreateComplete waiter starting.')
        let devPortalUrl =
            (await cfn.waitFor('stackCreateComplete', { StackName: stackName }).promise()).Stacks[0].Outputs
                .find((output) => output.OutputKey === 'WebsiteURL').OutputValue
        logger('stackCreateComplete waiter succeeded.')

        logger(`verifying that stack is available at ${devPortalUrl} .`)
        let staticIndex = await rp(devPortalUrl)

        expect(staticIndex.includes('<title>Developer Portal</title>')).toBeTruthy()
        logger(`verified that stack is available at ${devPortalUrl} .`)

        // add RoleArn: ... later
        logger('deleteStack call starting.')
        await cfn.deleteStack({ StackName: stackName }).promise()
        logger('deleteStack call succeeded.')

        logger('stackDeleteComplete waiter starting.')
        await cfn.waitFor('stackDeleteComplete', { StackName: stackName }).promise()
        logger('stackDeleteComplete waiter succeeded.')

        // pass the test; we successfully stood the stack up and tore it down
        expect(true).toBe(true)

        return true
    }

    test.concurrent('should stand up and tear down the stack in IAD', async () => {
        return commonTest('us-east-1', 'us-east-1')
    }, testTimeout)

    test.concurrent('should stand up and tear down the stack in a non-IAD region', async () => {
        return commonTest('us-west-2', 'us-west-2')
    }, testTimeout)

    // Implement these! Hardest part will be having test ACM certs in the account
    // test('should stand up and tear down a custom domain stack in IAD', async () => {
    //     return commonTest('us-east-1', 'domain-us-east-1')
    // }, testTimeout)
    //
    // test('should stand up and tear down a custom domain stack in a non-IAD region', async () => {
    //     return commonTest('us-west-2', 'domain-us-west-2')
    // }, testTimeout)
})