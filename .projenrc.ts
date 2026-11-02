import { AwsCdkTypeScriptAppProject } from "@nikovirtala/projen-constructs";

const cdkVersion = "2.166.0";

const project = new AwsCdkTypeScriptAppProject({
  cdkVersion: cdkVersion,
  name: "cdk-fargate-apigateway-http-api",
  context: { "@aws-cdk/core:newStyleStackSynthesis": true },
  authorEmail: "niko.virtala@hey.com",
  authorName: "Niko Virtala",
  authorUrl: "https://nikovirtala.dev/",
  license: "MIT",
  licensed: true,
  defaultReleaseBranch: "main",
  devDeps: ["@nikovirtala/projen-constructs"],
  pullRequestTemplate: false,
});

project.synth();
