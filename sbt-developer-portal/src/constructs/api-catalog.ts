import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';

export class ApiCatalog extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly updaterFunction: lambda.Function;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // S3 Bucket for API specifications
    this.bucket = new s3.Bucket(this, 'CatalogBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // Lambda function to update catalog when specs are uploaded
    this.updaterFunction = new nodejs.NodejsFunction(this, 'CatalogUpdater', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/catalog-updater/index.ts'),
      environment: {
        CATALOG_BUCKET: this.bucket.bucketName,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    });

    this.bucket.grantReadWrite(this.updaterFunction);

    // Trigger on S3 upload events
    this.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(this.updaterFunction),
      { suffix: '.json' }
    );

    this.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(this.updaterFunction),
      { suffix: '.yaml' }
    );

    this.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(this.updaterFunction),
      { suffix: '.yml' }
    );
  }
}
