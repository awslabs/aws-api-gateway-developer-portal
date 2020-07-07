#!/usr/bin/env python
import sys, subprocess, json, os, argparse, pprint

parser = argparse.ArgumentParser(description='Update v3 developer portal deployment')

parser.add_argument('-n', '--stack-name', required=True, help='CloudFormation stack name used for your deployed developer portal')
parser.add_argument('-b', '--s3-bucket', required=True, help='S3 bucket used to store build assets, passed to SAM')

args = parser.parse_args()

try:
  aws_scripting_env = os.environ
  if 'AWS_PAGER' in aws_scripting_env:
    aws_scripting_env = aws_scripting_env.copy()
    del aws_scripting_env['AWS_PAGER']

  parameter_overrides = []

  print('*** Getting previous stack variables... ***')

  decoder = json.JSONDecoder()
  starting_token_args = []
  while True:
    response = subprocess.check_output(
      [
        'aws', 'cloudformation', 'describe-stacks',
        '--stack-name', args.stack_name,
      ] + starting_token_args,
      env=aws_scripting_env
    )
    if response is not str:
      response = response.decode('utf-8')

    output = decoder.decode(response)

    for stack in output['Stacks']:
      for parameter in stack['Parameters']:
        parameter_overrides.append('{}="{}"'.format(parameter['ParameterKey'], parameter['ParameterValue']))

    next_token = output.get('NextToken')
    if next_token is None:
      break
    starting_token_args = ['--starting-token', next_token]
  
  print('*** Deploying stack... ***')

  subprocess.check_call(
    [
      'sam', 'package',
      '--template-file', './cloudformation/template.yaml',
      '--output-template-file', './cloudformation/packaged.yaml',
      '--s3-bucket', args.s3_bucket
    ],
    env=aws_scripting_env
  )
  
  subprocess.check_call(
    [
      'sam', 'deploy',
      '--template-file', './cloudformation/packaged.yaml',
      '--stack-name', args.stack_name,
      '--s3-bucket', args.s3_bucket,
      '--capabilities', 'CAPABILITY_NAMED_IAM',
      '--parameter-overrides'
    ] + parameter_overrides,
    env=aws_scripting_env
  )
  
  print('*** Stack successfully deployed. ***')
except subprocess.CalledProcessError as e:
  sys.exit(e.returncode)