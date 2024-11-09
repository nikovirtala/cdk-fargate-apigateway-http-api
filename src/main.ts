import {
  App,
  aws_apigatewayv2,
  aws_apigatewayv2_integrations,
  aws_ec2,
  aws_ecs,
  aws_servicediscovery,
  CfnOutput,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class HonkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create VPC with isolated (no routing to internet) subnets
    const vpc = new aws_ec2.Vpc(this, "HonkVpc", {
      ipAddresses: aws_ec2.IpAddresses.cidr("10.0.0.0/16"),
      enableDnsSupport: true,
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "isolated",
          subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Configure VPC for required services

    // ECR images are stored in s3, and thus s3 is needed
    vpc.addGatewayEndpoint("S3Endpoint", {
      service: aws_ec2.GatewayVpcEndpointAwsService.S3,
    });

    vpc.addInterfaceEndpoint("EcrEndpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.ECR,
      privateDnsEnabled: true,
      open: true,
    });

    vpc.addInterfaceEndpoint("EcrDockerEndpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      privateDnsEnabled: true,
      open: true,
    });

    vpc.addInterfaceEndpoint("LogsEndpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      privateDnsEnabled: true,
      open: true,
    });

    vpc.addInterfaceEndpoint("ApiGatewayEndpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      privateDnsEnabled: true,
      open: true,
    });

    // Create API Gateway VPC Link to get the service connected to VPC
    const vpcLink = new aws_apigatewayv2.VpcLink(this, "HonkVpcLink", {
      vpc: vpc,
      subnets: { subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // Create Service Discovery (Cloud Map) namespace
    const dnsNamespace = new aws_servicediscovery.PrivateDnsNamespace(
      this,
      "HonkDnsNamespace",
      {
        name: "honk.local",
        vpc: vpc,
      },
    );

    // Create ECS cluster
    const cluster = new aws_ecs.Cluster(this, "HonkCluster", {
      vpc: vpc,
      enableFargateCapacityProviders: true,
    });

    // Declare the ECS Task; one small container, built locally
    const taskDefinition = new aws_ecs.FargateTaskDefinition(
      this,
      "HonkTaskDefinition",
      {
        cpu: 256,
        memoryLimitMiB: 512,
      },
    );

    const container = taskDefinition.addContainer("HonkContainer", {
      image: aws_ecs.ContainerImage.fromAsset("./image"),
    });

    container.addPortMappings({ containerPort: 8080 });

    // Create Security Group to allow traffic to the Service
    const serviceSecurityGroup = new aws_ec2.SecurityGroup(
      this,
      "HonkServiceSecurityGroup",
      {
        vpc: vpc,
        allowAllOutbound: true,
        description: "Allow traffic to Fargate HTTP API service.",
        securityGroupName: "HonkServiceSecurityGroup",
      },
    );

    serviceSecurityGroup.addIngressRule(
      aws_ec2.Peer.ipv4(vpc.vpcCidrBlock),
      aws_ec2.Port.tcp(8080),
    );

    // Create the ECS service and register it to Service Discovery (Cloud Map)
    const service = new aws_ecs.FargateService(this, "HonkService", {
      cluster: cluster,
      capacityProviderStrategies: [
        {
          capacityProvider: "FARGATE_SPOT",
          weight: 1,
        },
        {
          capacityProvider: "FARGATE",
          weight: 0,
        },
      ],
      vpcSubnets: { subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [serviceSecurityGroup],
      platformVersion: aws_ecs.FargatePlatformVersion.VERSION1_4,
      taskDefinition: taskDefinition,
      circuitBreaker: {
        rollback: true,
      },
      assignPublicIp: false,
      desiredCount: 1,
      cloudMapOptions: {
        name: "service",
        cloudMapNamespace: dnsNamespace,
        dnsRecordType: aws_servicediscovery.DnsRecordType.SRV,
      },
    });

    // Create API Gateway HTTP API and point it to the ECS service via Service Discovery and VPC Link
    const api = new aws_apigatewayv2.HttpApi(this, "HonkAPI", {
      defaultIntegration:
        new aws_apigatewayv2_integrations.HttpServiceDiscoveryIntegration(
          "HonkServiceDiscoveryIntegration",
          //@ts-ignore
          service.cloudMapService,
          {
            vpcLink: vpcLink,
          },
        ),
    });

    // Print out the API endpoint after the deploy
    new CfnOutput(this, "Url", {
      value: api.url ?? "Something went wrong",
    });
  }
}

const app = new App();

new HonkStack(app, "Honk-dev");

app.synth();
