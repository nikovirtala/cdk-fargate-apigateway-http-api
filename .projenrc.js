const { awscdk } = require('projen');

const cdkVersion = '2.17.0';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: cdkVersion,
  name: 'cdk-fargate-apigateway-http-api',
  context: { '@aws-cdk/core:newStyleStackSynthesis': true },
  authorEmail: 'niko.virtala@hey.com',
  authorName: 'Niko Virtala',
  authorUrl: 'https://cloudgardener.dev/',
  license: 'MIT',
  licensed: true,
  buildWorkflow: true,
  codeCov: false,
  defaultReleaseBranch: 'main',
  deps: [
    `@aws-cdk/aws-apigatewayv2-alpha@${cdkVersion}-alpha.0`,
    `@aws-cdk/aws-apigatewayv2-integrations-alpha@${cdkVersion}-alpha.0`,
  ],
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
