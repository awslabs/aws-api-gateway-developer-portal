# Development guide

Note: this is for advanced users who want to modify the developer portal code itself.

## Getting Started

1. Install each of these if you haven't already:

    - [Git](https://git-scm.com/)
    - [Node](https://nodejs.org/en/download/) v12 or later
    - [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html)
    - [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
    - [CloudFormation Linter](https://github.com/aws-cloudformation/cfn-python-lint)

2. Clone this repo to your local drive.

3. Create a private S3 bucket for putting zipped lambda functions and zipped templates in. Note the bucket name for the next step. (This can be the same one you used during in the initial deployment.)

4. Create a `/dev-portal/deployer.config.js` file. We recommend using the same values you used during the initial deployment.

    - If you're just building this to release it locally and a fresh environment isn't needed, you can just copy `/dev-portal/example-deployer.config.js` and fill it in locally.
    - If you need to develop in a fresh environment (say, for contributing back to the developer portal or for some more advanced customization), you can customize this further, and you may find `/dev-portal/example-dev-deployer.config.js` as an easier starting point. The fields are the same, just you can switch between deployments far more easily.
    - You can put this elsewhere and pass `DEPLOYER_CONFIG=/path/to/deployer.config.js` as an environment variable each time you run a task that uses it, in case you would prefer to manage it outside the repo.

5. Run `node run install release`. This will install everything (the `install`), build the static assets for the first time (the `build` part of `release`), and deploy them (the `deploy` part of `release`).

6. Run `node run start` to start the local development server at `http://localhost:3000`. This also fetches the config from the live website so everything's hooked up correctly. (You can do both this and the previous step in one go via `node run install release start`.)

7. If you created the stack for the first time (or changed the `n` from the development `deployer.config.js` example), you'll need to register a new admin account. In the dev portal, register it as an ordinary user, then go into the Cognito user pool generated for it (you can find it by going to the deployed stack in CloudFormation and searching for "CognitoUserPool" in the "Logical ID" column), search for the account in question (by email is easiest), open it, and add it to the admin group (look for `${STACK_NAME}AdminsGroup`).

8. Make changes locally, test them at `http://localhost:3000`, and, when satisfied, run `npm run release` to build and upload the changes to your cloud dev portal.

## npm Scripts

You can run each of these via `node run ${TASK}`, and you can run multiple together like `node run build deploy`. You can pass options via `node run ${TASK} --key=value` as applicable.

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

## Notes on static assets

The static assets are only re-uploaded on deployment if the previous deployment and the current deployment were provided different `StaticAssetRebuildToken` parameters. The `npm run deploy` script automatically creates a unique `StaticAssetRebuildToken` for you based on the current date.
