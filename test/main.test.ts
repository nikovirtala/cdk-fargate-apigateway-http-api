import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, test } from "vitest";
import { HonkStack } from "../src/main.ts";

describe("HonkStack", () => {
    let template: Template;

    beforeAll(() => {
        template = Template.fromStack(new HonkStack(new App(), "test"));
    });

    test("creates a VPC with only isolated subnets and the endpoints Fargate needs (S3, ECR, ECR Docker, Logs, API Gateway)", () => {
        template.resourceCountIs("AWS::EC2::NatGateway", 0);
        template.resourceCountIs("AWS::EC2::InternetGateway", 0);
        template.resourceCountIs("AWS::EC2::VPCEndpoint", 5);
    });

    test("runs one task on Fargate Spot in the isolated subnets", () => {
        template.hasResourceProperties("AWS::ECS::Service", {
            DesiredCount: 1,
            PlatformVersion: "1.4.0",
            CapacityProviderStrategy: [
                { CapacityProvider: "FARGATE_SPOT", Weight: 1 },
                { CapacityProvider: "FARGATE", Weight: 0 },
            ],
            DeploymentConfiguration: Match.objectLike({
                DeploymentCircuitBreaker: { Enable: true, Rollback: true },
            }),
            NetworkConfiguration: {
                AwsvpcConfiguration: Match.objectLike({ AssignPublicIp: "DISABLED" }),
            },
        });
        template.hasResourceProperties("AWS::ECS::TaskDefinition", {
            Cpu: "256",
            Memory: "512",
            ContainerDefinitions: [Match.objectLike({ PortMappings: [Match.objectLike({ ContainerPort: 8080 })] })],
        });
    });

    test("registers the service in Cloud Map with SRV records", () => {
        template.hasResourceProperties("AWS::ServiceDiscovery::Service", {
            Name: "service",
            DnsConfig: Match.objectLike({ DnsRecords: [Match.objectLike({ Type: "SRV" })] }),
        });
    });

    test("routes the HTTP API to the service through a VPC link", () => {
        template.resourceCountIs("AWS::ApiGatewayV2::VpcLink", 1);
        template.hasResourceProperties("AWS::ApiGatewayV2::Integration", {
            IntegrationType: "HTTP_PROXY",
            ConnectionType: "VPC_LINK",
            IntegrationUri: { "Fn::GetAtt": [Match.stringLikeRegexp("^HonkServiceCloudmapService"), "Arn"] },
        });
        template.hasOutput("Url", {});
    });
});
