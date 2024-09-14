import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';

export class HonkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    // Create VPC with isolated (no routing to internet) subnets
    const vpc = new ec2.Vpc(this, 'HonkVpc', {
      cidr: '10.0.0.0/16',
      enableDnsSupport: true,
      maxAzs: 1,
      subnetConfiguration: [{ cidrMask: 24, name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED }],
    });

    // Configure VPC for required services

    // ECR images are stored in s3, and thus s3 is needed
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    vpc.addInterfaceEndpoint('EcrEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      privateDnsEnabled: true,
      open: true,
    });

    vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      privateDnsEnabled: true,
      open: true,
    });

    vpc.addInterfaceEndpoint('LogsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      privateDnsEnabled: true,
      open: true,
    });

    vpc.addInterfaceEndpoint('ApiGatewayEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      privateDnsEnabled: true,
      open: true,
    });

    // Create API Gateway VPC Link to get the service connected to VPC
    const vpcLink = new apigatewayv2.VpcLink(this, 'HonkVpcLink', {
      vpc: vpc,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // Create Service Discovery (Cloud Map) namespace
    const dnsNamespace = new servicediscovery.PrivateDnsNamespace(this, 'HonkDnsNamespace', {
      name: 'honk.local',
      vpc: vpc,
    });

    // Create ECS cluster
    const cluster = new ecs.Cluster(this, 'HonkCluster', {
      vpc: vpc,
      enableFargateCapacityProviders: true,
    });

    // Declare the ECS Task; one small container, built locally
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'HonkTaskDefinition', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    const container = taskDefinition.addContainer('HonkContainer', {
      image: ecs.ContainerImage.fromAsset('./image'),
    });

    container.addPortMappings({ containerPort: 8080 });

    // Create Security Group to allow traffic to the Service
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'HonkServiceSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: true,
      description: 'Allow traffic to Fargate HTTP API service.',
      securityGroupName: 'HonkServiceSecurityGroup',
    });

    serviceSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(8080));

    // Create the ECS service and register it to Service Discovery (Cloud Map)
    const service = new ecs.FargateService(this, 'HonkService', {
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
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [serviceSecurityGroup],
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
      taskDefinition: taskDefinition,
      circuitBreaker: {
        rollback: true,
      },
      assignPublicIp: false,
      desiredCount: 1,
      cloudMapOptions: {
        name: 'service',
        cloudMapNamespace: dnsNamespace,
        dnsRecordType: servicediscovery.DnsRecordType.SRV,
      },
    });

    // Create API Gateway HTTP API and point it to the ECS service via Service Discovery and VPC Link
    const api = new apigatewayv2.HttpApi(this, 'HonkAPI', {
      defaultIntegration: new apigatewayv2_integrations.HttpServiceDiscoveryIntegration(
        'HonkServiceDiscoveryIntegration',
        //@ts-ignore
        service.cloudMapService,
        {
          vpcLink: vpcLink,
        },
      ),
    });

    // Print out the API endpoint after the deploy
    new cdk.CfnOutput(this, 'Url', {
      value: api.url ?? 'Something went wrong',
    });
  }
}

const app = new cdk.App();

new HonkStack(app, 'Honk-dev');

app.synth();
