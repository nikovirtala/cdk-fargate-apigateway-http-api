import { VpcLink, HttpApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpServiceDiscoveryIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import {
  InterfaceVpcEndpointAwsService,
  Vpc,
  SubnetType,
  GatewayVpcEndpointAwsService,
  SecurityGroup,
  Peer,
  Port,
} from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  FargateService,
  FargatePlatformVersion,
} from 'aws-cdk-lib/aws-ecs';
import { PrivateDnsNamespace, DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { App, Stack, StackProps, CfnOutput } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export class HonkStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // Create VPC with isolated (no routing to internet) subnets
    const vpc = new Vpc(this, 'HonkVpc', {
      cidr: '10.0.0.0/16',
      enableDnsSupport: true,
      maxAzs: 1,
      subnetConfiguration: [{ cidrMask: 24, name: 'isolated', subnetType: SubnetType.PRIVATE_ISOLATED }],
    });

    // Configure VPC for required services

    // ECR images are stored in s3, and thus s3 is needed
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: GatewayVpcEndpointAwsService.S3,
    });

    vpc.addInterfaceEndpoint('EcrEndpoint', {
      service: InterfaceVpcEndpointAwsService.ECR,
      privateDnsEnabled: true,
      open: true,
    });

    vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
      service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
      privateDnsEnabled: true,
      open: true,
    });

    vpc.addInterfaceEndpoint('LogsEndpoint', {
      service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      privateDnsEnabled: true,
      open: true,
    });

    vpc.addInterfaceEndpoint('ApiGatewayEndpoint', {
      service: InterfaceVpcEndpointAwsService.APIGATEWAY,
      privateDnsEnabled: true,
      open: true,
    });

    // Create API Gateway VPC Link to get the service connected to VPC
    const vpcLink = new VpcLink(this, 'HonkVpcLink', {
      vpc: vpc,
      subnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
    });

    // Create Service Discovery (Cloud Map) namespace
    const dnsNamespace = new PrivateDnsNamespace(this, 'HonkDnsNamespace', {
      name: 'honk.local',
      vpc: vpc,
    });

    // Create ECS cluster
    const cluster = new Cluster(this, 'HonkCluster', {
      vpc: vpc,
      enableFargateCapacityProviders: true,
    });

    // Declare the ECS Task; one small container, built locally
    const taskDefinition = new FargateTaskDefinition(this, 'HonkTaskDefinition', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    const container = taskDefinition.addContainer('HonkContainer', {
      image: ContainerImage.fromAsset('./image'),
    });

    container.addPortMappings({ containerPort: 8080 });

    // Create Security Group to allow traffic to the Service
    const serviceSecurityGroup = new SecurityGroup(this, 'HonkServiceSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: true,
      description: 'Allow traffic to Fargate HTTP API service.',
      securityGroupName: 'HonkServiceSecurityGroup',
    });

    serviceSecurityGroup.addIngressRule(Peer.ipv4(vpc.vpcCidrBlock), Port.tcp(8080));

    // Create the ECS service and register it to Service Discovery (Cloud Map)
    const service = new FargateService(this, 'HonkService', {
      cluster: cluster,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
        },
        {
          capacityProvider: 'FARGATE',
          weight: 0,
        },
      ],
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      securityGroups: [serviceSecurityGroup],
      platformVersion: FargatePlatformVersion.VERSION1_4,
      taskDefinition: taskDefinition,
      circuitBreaker: {
        rollback: true,
      },
      assignPublicIp: false,
      desiredCount: 1,
      cloudMapOptions: {
        name: 'service',
        cloudMapNamespace: dnsNamespace,
        dnsRecordType: DnsRecordType.SRV,
      },
    });

    // Create API Gateway HTTP API and point it to the ECS service via Service Discovery and VPC Link
    const api = new HttpApi(this, 'HonkAPI', {
      defaultIntegration: new HttpServiceDiscoveryIntegration({
        vpcLink: vpcLink,
        //@ts-ignore
        service: service.cloudMapService,
      }),
    });

    // Print out the API endpoint after the deploy
    new CfnOutput(this, 'Url', {
      value: api.url ?? 'Something went wrong',
    });
  }
}

const app = new App();

new HonkStack(app, 'Honk-dev');

app.synth();
