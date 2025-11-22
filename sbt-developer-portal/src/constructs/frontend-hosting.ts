import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as path from 'path';

export interface FrontendHostingProps {
  readonly apiUrl: string;
  readonly userPoolId: string;
  readonly userPoolClientId: string;
  readonly identityPoolId: string;
  readonly region: string;
  readonly customDomainName?: string;
  readonly certificateArn?: string;
}

export class FrontendHosting extends Construct {
  public readonly websiteUrl: string;
  public readonly distributionDomainName: string;
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendHostingProps) {
    super(scope, id);

    // S3 Bucket for static website
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'Developer Portal OAI',
    });

    this.bucket.grantRead(originAccessIdentity);

    // CloudFront Function for security headers
    const securityHeadersFunction = new cloudfront.Function(this, 'SecurityHeaders', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  // Security headers
  headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload' };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['x-xss-protection'] = { value: '1; mode=block' };
  headers['referrer-policy'] = { value: 'same-origin' };
  headers['content-security-policy'] = {
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com;"
  };

  return response;
}
      `),
    });

    // Certificate for custom domain (if provided)
    let certificate: acm.ICertificate | undefined;
    if (props.certificateArn) {
      certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn);
    }

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: securityHeadersFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
          },
        ],
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      domainNames: props.customDomainName ? [props.customDomainName] : undefined,
      certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      enableIpv6: true,
    });

    this.distributionDomainName = this.distribution.distributionDomainName;

    // Route53 Record (if custom domain is provided)
    if (props.customDomainName) {
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.customDomainName,
      });

      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
        recordName: props.customDomainName,
      });

      this.websiteUrl = `https://${props.customDomainName}`;
    } else {
      this.websiteUrl = `https://${this.distributionDomainName}`;
    }

    // Create runtime config file
    const runtimeConfig = {
      region: props.region,
      apiUrl: props.apiUrl,
      userPoolId: props.userPoolId,
      userPoolClientId: props.userPoolClientId,
      identityPoolId: props.identityPoolId,
    };

    // Deploy website assets
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist')),
        s3deploy.Source.jsonData('config.json', runtimeConfig),
      ],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      memoryLimit: 512,
    });
  }
}
