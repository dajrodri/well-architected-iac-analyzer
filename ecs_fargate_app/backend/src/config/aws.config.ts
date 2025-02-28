import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { WellArchitectedClient } from '@aws-sdk/client-wellarchitected';
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

@Injectable()
export class AwsConfigService {
  constructor(private configService: ConfigService) {}

  createS3Client(): S3Client {
    return new S3Client(this.getAwsConfig());
  }

  createBedrockClient(): BedrockRuntimeClient {
    return new BedrockRuntimeClient(this.getAwsConfig());
  }

  createWAClient(): WellArchitectedClient {
    return new WellArchitectedClient(this.getAwsConfig());
  }

  createBedrockAgentClient(): BedrockAgentRuntimeClient {
    return new BedrockAgentRuntimeClient(this.getAwsConfig());
  }

  createDynamoDBClient(): DynamoDBClient {
    return new DynamoDBClient(this.getAwsConfig());
  }

  private getAwsConfig() {
    return {
      region: this.configService.get<string>('aws.region'),
    };
  }
}