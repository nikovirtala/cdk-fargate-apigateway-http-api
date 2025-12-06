# Product Overview

This is a demonstration AWS CDK stack that shows how to publish an API running on AWS Fargate in a private subnet to Amazon API Gateway HTTP API.

## Key Features

- Private subnet architecture using VPC endpoints instead of NAT Gateways
- Fargate service accessible via API Gateway HTTP API
- Service discovery using AWS Cloud Map
- Cost-optimized with FARGATE_SPOT capacity provider

## Architecture

The solution connects a containerized application running on Fargate (in isolated subnets with no internet routing) to API Gateway using:
- VPC Link for private integration
- Service Discovery (Cloud Map) for service registration
- VPC endpoints for AWS service access (ECR, S3, CloudWatch Logs)

The deployed API returns a simple HTML page with ASCII art ("Honk!") demonstrating successful private integration.
