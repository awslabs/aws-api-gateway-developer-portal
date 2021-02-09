# Development guide

*Note: this is for advanced users who want to modify the developer portal itself.*

## Getting Started

1. Install each of these if you haven't already:

    - [Git](https://git-scm.com/)
    - [Node](https://nodejs.org/en/download/) v12 or later
    - [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html)
    - [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
    - [CloudFormation Linter (`cfn-lint`)](https://github.com/aws-cloudformation/cfn-python-lint)

    If you have not used the AWS CLI or SAM CLI before, you may need to [configure your AWS credentials file](https://docs.aws.amazon.com/cli/latest/userguide/cli-config-files.html) as well.

    You can feel free to ignore the Docker requirement for the SAM CLI as the build scripts offer a local development server to try your changes as you make them.

2. Clone this repo to your local drive.

3. Create a private S3 bucket for putting zipped lambda functions and zipped templates in. Note the bucket name for the next step. (This can be the same one you used during in the initial deployment.)

4. Create a `dev-portal/deployer.config.js` file. We recommend using the same values you used during the initial deployment.

    - If you're just building this to release it locally and a fresh environment isn't needed, you can just copy [`dev-portal/example-deployer.config.js`](dev-portal/example-deployer.config.js) and fill it in locally.
    - If you need to develop in a fresh environment (say, for contributing back to the developer portal or for some more advanced customization), you can customize this further, and you may find [`dev-portal/example-dev-deployer.config.js`](dev-portal/example-dev-deployer.config.js) as an easier starting point. The fields are the same, just you can switch between deployments far more easily.
    - You can put this elsewhere and pass `DEPLOYER_CONFIG=/path/to/deployer.config.js` as an environment variable each time you run a task that uses it (like `release`), in case you would prefer to manage it outside the repo.
    - Please see [here](#deployer-configuration) for explanation of all the various options available.

5. Run `node run install release`. This will install everything (the `install`), build the static assets for the first time (the `build` part of `release`), and deploy them (the `deploy` part of `release`).

6. Run `node run start` to start the local development server at [`http://localhost:3000`](http://localhost:3000). This also fetches the config from the live website so everything's hooked up correctly. (You can do both this and the previous step in one go via `node run install release start`.)

7. If you created the stack for the first time (or changed the `n` from the development `deployer.config.js` example), you'll need to register a new admin account. In the dev portal, register it as an ordinary user, then go into the Cognito user pool generated for it (you can find it by going to the deployed stack in CloudFormation and searching for "CognitoUserPool" in the "Logical ID" column), search for the account in question (by email is easiest), open it, and add it to the admin group (look for `${STACK_NAME}AdminsGroup`).

8. Make changes locally, test them at [`http://localhost:3000`](http://localhost:3000), and, when satisfied, run `node run release` to build and upload the changes to your cloud dev portal.

> If you have previously set up a v1 developer portal through the Serverless Application Repo, you will need to either remove all the v1 developer portal resources (dynamo tables, roles, etc.) or provide new names for the v2 developer portal by passing in parameter overrides for every resource.

## Deployer configuration

The deployer configuration file is used to control the SAM deployment scripts. There are several various configuration parameters, most of which correspond to SAM template parameters, but some that affect behavior outside of that as well.

Required paramters are explicitly denoted as such, and all other parameters are optional.

### `awsSamCliProfile: string`

*Default: `"default"`*

This is the AWS CLI profile to use for the deployment. If you have multiple profiles, it's highly recommended that you change this accordingly.

### `buildAssetsBucket: string` (Required)

This S3 bucket is used to hold all the build artifacts. Unlike everything else here, it must be pre-made, and as an S3 bucket, the name must be globally unique.

### `stackName: string` (Required)

This is the name of the CloudFormation stack to create and deploy. As a CloudFormation stack name, it must be unique to your account.

### `siteAssetsBucket: string` (Required)

This S3 bucket holds the site's static assets to serve from the generated CloudFront distribution. As an S3 bucket, the name must be globally unique.

### `customDomainName: string`

The domain name to serve the site from. If omitted, CloudFront generates a random subdomain for you and provides that.

### `customDomainNameAcmCertArn: string`

The ARN of the ACM certificate corresponding to the custom domain given by `customDomainName` above. This has no effect unless `customDomainName` is configured.

### `useRoute53Nameservers: boolean`

*Default: `false`*

Whether to use Route53's nameservers for your custom domain. If omitted, you will have to provide your own nameservers. This has no effect unless `customDomainName` is configured.

### `cognitoDomainName: string` (Required)

This is the Cognito user pool domain prefix to use for the sign up/sign in UI. If you also provide  `cognitoDomainAcmCertArn`, this is a subdomain of the certificate's associated domain and it must be unique to all subdomains of that domain. If not, this is just a subdomain of Cognito's domain and it must be globally unique.

### `cognitoDomainAcmCertArn: string`

The ARN of the ACM certificate corresponding to the custom domain to use to host the Cognito sign up/sign in UI. This may be omitted, in which it just uses Cognito's domain for the region it's deploied in.

### `cognitoIdentityPoolName: string`

*Default: `'DevPortalIdentityPool'`*

The name of the generated Cognito identity pool.

### `customersTableName: string`

*Default: `'DevPortalCustomers'`*

The name of the customers DynamoDB table.

### `preLoginAccountsTableName: string`

*Default: `'DevPortalPreLoginAccounts'`*

The name of the pre-login accounts DynamoDB table.

### `feedbackTableName: string`

*Default: `'DevPortalFeedback'`*

The name of the feedback DynamoDB table.

<!--
**FIXME**: Marketplace subscription is broken. Once fixed, update this section.

### `marketplaceSubscriptionTopic: string`

*Default: `'DevPortalMarketplaceSubscriptionTopic'`*

The marketplace SNS topic suffix for subscription/unsubscription events.

-->

### `accountRegistrationMode: string`

*Default: `'open'`*

This determines who can register for an account.

- `'open'` - Any user may register for an account.
<!--
- `'request'` - Any user may request an account, but an administrator must approve the request in order for the account to access the developer portal.
-->
- In `'invite'` mode, users cannot register or request an account; instead, an Admin must send an invite for the user to accept.

### `feedbackEmail: string`

The email address where user submitted feedback notifications get sent. This may be omitted, in which feedback submission is disabled.

### `staticAssetRebuildMode: string`

*Default: `''`*

Set this to `'overwrite-content'` if you want to reset your custom content (like in `custom-content/content-fragments/`) within the static assets bucket back to the defaults generated at build time, or to `''` to retain custom content.

### `awsSamCliProfile: string`

*Default: `'my-profile'`*

AWS SAM CLI profile option: optional specific profile from your AWS credential file. Not used by default.

### `developmentMode: boolean`

*Default: `false`*

Set this to `true` if you want to enable development mode. It's `false` by default, and unless you're actively developing on the developer portal itself locally, you should generally leave it unset as it disables most protections, including CORS.

### `edgeLambdaRebuildToken: string`

*Default: `'defaultRebuildToken'`*

Change this value if you want to update the edge lambda or its replicator lambda in the next deployment. In general, you shouldn't need to set it unless either 1. you're developing against the project and need to make changes to it, or 2. the project updated that part of the code and you just pulled its changes in preparation to update your deployment.

> Why is this not handled internally? At the time of writing, edge lambdas are difficult to delete due to how long it takes for all their replicas to delete, and you can't delete lambdas with active replicas. This process could take anywhere from a couple hours to several days (well past the largest timeout supported by Lambda), and neither CloudFront nor Lambda currently offer any hooks to know when all the replicas are gone. So edge lambda versions are only created, never deleted, by the template.
>
> For this reason, it's better to require the user to explicitly choose when to update the lambda, so that during development, you're not flooded with versions, and during production, you can be better aware of when things change (it's on your account, after all).

### `samTemplate: string`

*Default: `cloudformation/template.yaml` relative to the repo's root*

Set this to the path to your SAM template. It defaults to the one in the repo, and you generally shouldn't need to change it.

### `packageConfig: string`

*Default: `cloudformation/packaged.yaml` relative to the repo's root*

Set this to where you wish to save the packaged template to a specific location other than the reserved location in the repo. In general, you shouldn't need to configure this, but it exists for more advanced use cases.

## npm Scripts

You can run each of these via `node run ${TASK}`, and you can run multiple together like `node run build deploy`. You can pass options via `node run ${TASK} --key=value` as applicable.

### `node run reinstall`

Removes and reinstalls the dependencies everywhere. It does the obvious `rm -rf node_modules && npm install` in each package, but before reinstalling, it also handles the edge case of within `dev-portal`, one of the dependencies is partially under source control.

### `node run build`

Builds a production-quality build and copies it to the lambda uploader.

### `node run deploy`

Starts a `sam package` and `sam deploy`, and on success does `node run write-config`. Does not build on its own, though.

### `node run reset-assets`

Resets the static assets to what was last committed to Git. Mainly useful when you want to update a development deployment.

### `node run release`

Synonymous with `node run build deploy reset-assets`, as that's a common operation.

### `node run start`

Gets the output from the CFN stack, writes a local version of the config.js file, and starts up the local development server.

### `node run lint`

Lint all code in the repo using ESLint and `cfn-lint`.

### `node run version --inc=patch|minor|major|prepatch|preminor|premajor|prerelease --type=beta`

Update all package versions with a version increment and optional prerelease identifier (as used by [semver](https://www.npmjs.com/package/semver)), and create a commit with the updated files and all files that were already staged prior to running this command.

### `node run test`

Run all the unit tests.

### `node run test --coverage=true`

Run all the unit tests with coverage.

### `node run test --integ=true`

Run all the integration tests.

## Notes on testing

If you need to run the unit tests with a debugger, you'll need to run them manually using the relevant test runners.

- For the unit tests in `dev-portal/`, run `npx react-scripts --inspect-brk test --runInBand --no-cache` in that directory.
- For the unit tests in `lambdas/`, run `npx -n=--inspect-brk jest --runInBand --no-cache` in that directory.

## Notes on static assets

The static assets are only re-uploaded on deployment if the previous deployment and the current deployment were provided different `StaticAssetRebuildToken` parameters. The `node run deploy` script automatically creates a unique `StaticAssetRebuildToken` for you based on the current date, so it updates on every deployment.
