# SAM Deployment Guide

If you plan to automate the deployment through your own infrastructure, deploy multiple instances to a single account, or if you just want to customize the template, you can do so using just the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html).

## Getting Started

1. Install each of these if you haven't already:

    - [Git](https://git-scm.com/)
    - [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
    - [CloudFormation Linter (`cfn-lint`)](https://github.com/aws-cloudformation/cfn-python-lint) is recommended if you want to customize the template.

    If you have not used the AWS CLI or SAM CLI before, you may need to [configure your AWS credentials file](https://docs.aws.amazon.com/cli/latest/userguide/cli-config-files.html) as well.

    You can feel free to ignore the Docker requirement unless you wish to perform local test deployments using SAM.

2. Create a private S3 bucket for putting zipped lambda functions and zipped templates in. Note the bucket name for the next step. (This can be the same one you used during in the initial deployment.) From here on out, we'll refer to this as `YOUR_LAMBDA_ARTIFACTS_BUCKET`, but you'll need to replace it accordingly.

3. Pick a custom prefix for your application for your static assets and artifacts. This should be globally unique across all of AWS, like your org name, GitHub username, or similar. From here on out, we'll refer to this as `YOUR_CUSTOM_PREFIX`, but you'll need to replace it accordingly.

4. Open a terminal (or Command Prompt window in Windows) and run the following two commands to clone this repo to your local drive and enter that directory. The command is the same for all platforms.

    ```bash
    git clone https://github.com/awslabs/aws-api-gateway-developer-portal.git
    cd aws-api-gateway-developer-portal
    ```

5. If desired, open the directory you cloned it to with your favorite text editor, modify the template (located at `cloudformation/template.yaml`) as desired and then run `cfn-lint` just to verify you didn't make any obvious mistakes.

    > If you don't know where to find it, try looking at the prompt. If that doesn't contain any slashes, you can find it this way:
    >
    > - macOS, Linux, and similar: run `pwd` and it will print out the full current path.
    > - Windows: run `cd` and it should print out the current path. If that doesn't work, try `echo %cd%` instead.
    >
    > If you don't have a text editor like Notepad++ or Visual Studio Code installed, most operating systems have their own rudimentary text editor built-in, though it may be a little awkward to use.
    >
    > - Windows: `notepad.exe .\cloudformation\template.yaml`
    > - macOS: `open -a TextEdit ./cloudformation/template.yaml`
    > - Most Linux environments: `xdg-open ./cloudformation/template.yaml`

6. Open a terminal (or Command Prompt window in Windows) and run the following SAM CLI command to package the deployment.

    ```bash
    # macOS, Linux, and similar
    sam package --template-file ./cloudformation/template.yaml \
        --output-template-file ./cloudformation/packaged.yaml \
        --s3-bucket "YOUR_LAMBDA_ARTIFACTS_BUCKET"
    ```

    ```bat
    rem Windows
    sam package --template-file .\cloudformation\template.yaml ^
        --output-template-file .\cloudformation\packaged.yaml ^
        --s3-bucket "YOUR_LAMBDA_ARTIFACTS_BUCKET"
    ```

    Do *not* run the `sam deploy` command suggested by the output of the above. While it works most of the time, it doesn't work if you need to customize anything, as we will need to.

7. Run the following command in that same terminal to deploy.

    ```bash
    # macOS, Linux, and similar
    sam deploy --template-file ./cloudformation/packaged.yaml \
        --stack-name "dev-portal" \
        --s3-bucket "YOUR_LAMBDA_ARTIFACTS_BUCKET" \
        --capabilities CAPABILITY_NAMED_IAM \
        --parameter-overrides \
        DevPortalSiteS3BucketName="YOUR_CUSTOM_PREFIX-dev-portal-static-assets" \
        ArtifactsS3BucketName="YOUR_CUSTOM_PREFIX-dev-portal-artifacts" \
        CognitoDomainNameOrPrefix="YOUR_CUSTOM_PREFIX"
    ```

    ```bat
    rem Windows
    sam deploy --template-file .\cloudformation\packaged.yaml ^
        --stack-name "dev-portal" ^
        --s3-bucket "YOUR_LAMBDA_ARTIFACTS_BUCKET" ^
        --capabilities CAPABILITY_NAMED_IAM ^
        --parameter-overrides ^
        DevPortalSiteS3BucketName="YOUR_CUSTOM_PREFIX-dev-portal-static-assets" ^
        ArtifactsS3BucketName="YOUR_CUSTOM_PREFIX-dev-portal-artifacts" ^
        CognitoDomainNameOrPrefix="YOUR_CUSTOM_PREFIX"
    ```

    > Note: [`CAPABILITY_NAMED_IAM` is a value required by SAM, not a placeholder.](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html)

8. If you have the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html) installed, run the following command in that same terminal to get the newly deployed URL. You will need it for the remaining steps.

    ```bash
    # macOS, Linux, and similar
    aws cloudformation describe-stacks --query \
        "Stacks[?StackName=='dev-portal'][Outputs[?OutputKey=='WebsiteURL']][][].OutputValue"
    ```

    ```bat
    rem Windows
    aws cloudformation describe-stacks --query ^
        "Stacks[?StackName=='dev-portal'][Outputs[?OutputKey=='WebsiteURL']][][].OutputValue"
    ```

    Otherwise, you can do this by opening the CloudFormation console, opening your developer portal's stack, going to the "Outputs" tab, and searching for "WebsiteURL". This will show you the URL as a clickable link.

9. From here, [continue to the documentation on how to create an admin user for your newly created developer portal](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-developer-portal.html#apigateway-developer-portal-create-admin).

> If you have previously set up a v1 developer portal through the Serverless Application Repo, you will need to either remove all the v1 developer portal resources (dynamo tables, roles, etc.) or provide new names for the v2 developer portal by passing in parameter overrides for every resource. You will also want to choose a name other than `dev-portal` for the CloudFormation stack.

You can override any of the deployment settings using the `--parameter-overrides key="value"` format as demonstrated above. This will be necessary if you intend to deploy several instances of the developer portal or customize some of the features. You can see a full list of overridable parameters in `cloudformation/template.yaml` under the `Parameters` section as well as various documentation on it, and you can see an overview of the most common settings [in the developer portal documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-developer-portal.html#apigateway-developer-portal-settings).

## Updating

This assumes you already have this repo cloned. If you created it through SAR and wish to update through SAM, you can still do it this way, but you'll have to do the first two steps first to get the code.

1. Open a terminal (or Command Prompt window in Windows) and run the following two commands to navigate to your local clone of the repo and update it. If you've made changes to the template, you may need to reconcile them accordingly—see the note in step 5 of [Getting Started](#getting-started) for info.

    ```bash
    # macOS, Linux, and similar
    cd path/to/aws-api-gateway-developer-portal/
    git pull
    ```

    ```bat
    rem Windows
    cd path\to\aws-api-gateway-developer-portal\
    git pull
    ```

2. Recall your choices for the CloudFormation stack name, assets bucket, and prefix as per steps 2 and 3 in the [Getting Started](#getting-started) instructions. (If you used entirely different names for the assets and artifacts buckets during creation, that's fine—just use those instead.)

3. Update your deployment by performing steps 6 and 7 in the [Getting Started](#getting-started) instructions, but setting a `StaticAssetRebuildToken` value different from the previous one (it can be any arbitrary value).

    If you have the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html) installed, you can run the following command in that same terminal to get the last used value.

    ```bash
    # macOS, Linux, and similar
    aws cloudformation describe-stacks --query \
        "Stacks[?StackName=='dev-portal'][].Parameters[?ParameterKey=='StaticAssetRebuildToken'][].ParameterValue"
    ```

    ```bat
    rem Windows
    aws cloudformation describe-stacks --query ^
        "Stacks[?StackName=='dev-portal'][].Parameters[?ParameterKey=='StaticAssetRebuildToken'][].ParameterValue"
    ```

    Otherwise, you can do this by opening the CloudFormation console, opening your developer portal's stack, going to the "Parameters" tab, and searching for "StaticAssetRebuildToken".