const { AwsCdkTypeScriptApp } = require('projen');

const project = new AwsCdkTypeScriptApp({
  cdkVersion: '1.128.0',
  name: 'cdk-fargate-apigateway-http-api',
  cdkDependencies: [
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-apigatewayv2',
    '@aws-cdk/aws-ecs',
    '@aws-cdk/aws-servicediscovery',
    '@aws-cdk/aws-apigatewayv2-integrations',
  ],
  context: { '@aws-cdk/core:newStyleStackSynthesis': true },
  authorEmail: 'niko.virtala@hey.com',
  authorName: 'Niko Virtala',
  authorUrl: 'https://cloudgardener.dev/',
  license: 'MIT',
  licensed: true,
  buildWorkflow: true,
  codeCov: false,
  defaultReleaseBranch: 'main',
  dependabot: false,
  depsUpgradeOptions: {
    ignoreProjen: false,
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
      secret: 'AUTOMATION_TOKEN',
    },
  },
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['nikovirtala'],
  },
  eslint: true,
  eslintOptions: {
    prettier: true,
  },
  jest: false,
  mergify: true,
  pullRequestTemplate: false,
});

project.synth();
