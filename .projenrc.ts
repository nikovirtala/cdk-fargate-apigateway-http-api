import { awscdk } from "projen";

const cdkVersion = "2.166.0";

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: cdkVersion,
  name: "cdk-fargate-apigateway-http-api",
  context: { "@aws-cdk/core:newStyleStackSynthesis": true },
  authorEmail: "niko.virtala@hey.com",
  authorName: "Niko Virtala",
  authorUrl: "https://nikovirtala.dev/",
  license: "MIT",
  licensed: true,
  buildWorkflow: true,
  codeCov: false,
  defaultReleaseBranch: "main",
  dependabot: false,
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ["auto-approve", "auto-merge"],
    },
  },
  autoApproveOptions: {
    secret: "GITHUB_TOKEN",
    allowedUsernames: ["nikovirtala"],
  },
  eslint: true,
  prettier: true,
  jest: false,
  mergify: true,
  pullRequestTemplate: false,
  typescriptVersion: "5.6.3",
  projenrcTs: true,
});

project.synth();
