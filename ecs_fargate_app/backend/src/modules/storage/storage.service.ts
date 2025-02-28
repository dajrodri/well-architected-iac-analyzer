import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsConfigService } from '../../config/aws.config';
import {
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Upload } from "@aws-sdk/lib-storage";
import {
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { createHash } from 'crypto';
import {
  WorkItem,
  WorkItemUpdate,
  S3Locations,
  StorageConfig,
} from '../../shared/interfaces/storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly config: StorageConfig;

  constructor(
    private readonly awsConfig: AwsConfigService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      enabled: true,
      bucket: this.configService.get<string>('storage.bucket'),
      table: this.configService.get<string>('storage.table'),
    };
  }

  public createUserIdHash(email: string): string {
    // Trim and lowercase email before hashing to ensure consistency
    const normalizedEmail = email.trim().toLowerCase();
    return createHash('sha256').update(normalizedEmail).digest('hex');
  }

  private createFileIdHash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private getS3Locations(userId: string, fileId: string): S3Locations {
    const prefix = `${userId}/${fileId}`;
    return {
      metadata: `${prefix}/metadata.json`,
      originalContent: `${prefix}/original_content`,
      analysisResults: `${prefix}/analysis/analysis_results.json`,
      iacDocument: `${prefix}/iac_templates/generated_template`,
    };
  }

  async createWorkItem(
    userId: string,
    fileName: string,
    fileType: string,
    fileBuffer: Buffer,
  ): Promise<WorkItem> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const fileId = this.createFileIdHash(fileName + Date.now().toString());
    const timestamp = new Date().toISOString();
    const s3Client = this.awsConfig.createS3Client();
    const dynamoClient = this.awsConfig.createDynamoDBClient();
    const s3Locations = this.getS3Locations(userId, fileId);

    const workItem: WorkItem = {
      userId,
      fileId,
      fileName,
      fileType,
      uploadDate: timestamp,
      analysisStatus: 'NOT_STARTED',
      analysisProgress: 0,
      iacGenerationStatus: 'NOT_STARTED',
      iacGenerationProgress: 0,
      s3Prefix: `${userId}/${fileId}`,
      lastModified: timestamp,
    };

    try {
      // Store metadata in DynamoDB
      await dynamoClient.send(
        new PutItemCommand({
          TableName: this.config.table,
          Item: marshall(workItem, { removeUndefinedValues: true }),
        }),
      );

      // Store the original content
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: this.config.bucket,
          Key: s3Locations.originalContent,
          Body: fileBuffer,
          ContentType: fileType,
        },
      });

      await upload.done();

      // Store metadata in S3
      const metadataUpload = new Upload({
        client: s3Client,
        params: {
          Bucket: this.config.bucket,
          Key: s3Locations.metadata,
          Body: JSON.stringify(workItem),
          ContentType: 'application/json',
        },
      });

      await metadataUpload.done();

      return workItem;
    } catch (error) {
      this.logger.error('Error creating work item:', error);
      throw new Error('Failed to create work item');
    }
  }

  async updateWorkItem(
    userId: string,
    fileId: string,
    updates: WorkItemUpdate,
  ): Promise<WorkItem> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const dynamoClient = this.awsConfig.createDynamoDBClient();
    const updateExpr = [];
    const exprAttrNames = {};
    const exprAttrValues = {};
    let updateExprStr = 'SET ';

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpr.push(`#${key} = :${key}`);
        exprAttrNames[`#${key}`] = key;
        exprAttrValues[`:${key}`] = value;
      }
    });

    updateExprStr += updateExpr.join(', ');

    try {
      const result = await dynamoClient.send(
        new UpdateItemCommand({
          TableName: this.config.table,
          Key: marshall({
            userId,
            fileId,
          }),
          UpdateExpression: updateExprStr,
          ExpressionAttributeNames: exprAttrNames,
          ExpressionAttributeValues: marshall(exprAttrValues),
          ReturnValues: 'ALL_NEW',
        }),
      );

      return unmarshall(result.Attributes) as WorkItem;
    } catch (error) {
      this.logger.error('Error updating work item:', error);
      throw new Error('Failed to update work item');
    }
  }

  async getWorkItem(userId: string, fileId: string): Promise<WorkItem> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const dynamoClient = this.awsConfig.createDynamoDBClient();

    try {
      const result = await dynamoClient.send(
        new GetItemCommand({
          TableName: this.config.table,
          Key: marshall({
            userId,
            fileId,
          }),
        }),
      );

      if (!result.Item) {
        throw new Error('Work item not found');
      }

      return unmarshall(result.Item) as WorkItem;
    } catch (error) {
      this.logger.error('Error getting work item:', error);
      throw new Error('Failed to get work item');
    }
  }

  async listWorkItems(userId: string): Promise<WorkItem[]> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const dynamoClient = this.awsConfig.createDynamoDBClient();

    try {
      const result = await dynamoClient.send(
        new QueryCommand({
          TableName: this.config.table,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: marshall({
            ':userId': userId,
          }),
        }),
      );

      return (result.Items || []).map((item) => unmarshall(item) as WorkItem);
    } catch (error) {
      this.logger.error('Error listing work items:', error);
      throw new Error('Failed to list work items');
    }
  }

  async deleteWorkItem(userId: string, fileId: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const s3Client = this.awsConfig.createS3Client();
    const dynamoClient = this.awsConfig.createDynamoDBClient();

    try {
      // Delete all objects in S3 with the prefix
      const listResult = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: `${userId}/${fileId}`,
        }),
      );

      if (listResult.Contents && listResult.Contents.length > 0) {
        await s3Client.send(
          new DeleteObjectsCommand({
            Bucket: this.config.bucket,
            Delete: {
              Objects: listResult.Contents.map((obj) => ({ Key: obj.Key })),
            },
          }),
        );
      }

      // Delete metadata from DynamoDB
      await dynamoClient.send(
        new DeleteItemCommand({
          TableName: this.config.table,
          Key: marshall({
            userId,
            fileId,
          }),
        }),
      );
    } catch (error) {
      this.logger.error('Error deleting work item:', error);
      throw new Error('Failed to delete work item');
    }
  }

  async storeAnalysisResults(
    userId: string,
    fileId: string,
    results: any,
  ): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const s3Client = this.awsConfig.createS3Client();
    const s3Locations = this.getS3Locations(userId, fileId);

    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: this.config.bucket,
          Key: s3Locations.analysisResults,
          Body: JSON.stringify(results),
          ContentType: 'application/json',
        },
      });

      await upload.done();
    } catch (error) {
      this.logger.error('Error storing analysis results:', error);
      throw new Error('Failed to store analysis results');
    }
  }

  async getAnalysisResults(userId: string, fileId: string): Promise<any> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const s3Client = this.awsConfig.createS3Client();
    const s3Locations = this.getS3Locations(userId, fileId);

    try {
      const result = await s3Client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: s3Locations.analysisResults,
        }),
      );

      const content = await result.Body.transformToString();
      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Error getting analysis results:', error);
      throw new Error('Failed to get analysis results');
    }
  }

  async storeIaCDocument(
    userId: string,
    fileId: string,
    content: string,
    extension: string,
    templateType?: string,
  ): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const s3Client = this.awsConfig.createS3Client();
    const s3Locations = this.getS3Locations(userId, fileId);

    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: this.config.bucket,
          Key: `${s3Locations.iacDocument}.${extension}`,
          Body: content,
        },
      });

      await upload.done();

      if (templateType) {
        await this.updateWorkItem(userId, fileId, {
          iacGeneratedFileType: templateType,
          lastModified: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error('Error storing IaC document:', error);
      throw new Error('Failed to store IaC document');
    }
  }

  async getIaCDocument(
    userId: string,
    fileId: string,
    extension: string,
    workItem?: WorkItem,
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const s3Client = this.awsConfig.createS3Client();
    const s3Locations = this.getS3Locations(userId, fileId);

    try {
      // If workItem is provided and has iacGeneratedFileType, use that instead of the provided extension
      const iacGeneratedExtension = workItem?.iacGeneratedFileType ?
        this.getExtensionFromTemplateType(workItem.iacGeneratedFileType) :
        extension;

      const result = await s3Client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: `${s3Locations.iacDocument}.${iacGeneratedExtension}`,
        }),
      );

      return await result.Body.transformToString();
    } catch (error) {
      this.logger.error('Error getting IaC document:', error);
      throw new Error('Failed to get IaC document');
    }
  }

  // Add helper method to get extension from template type
  private getExtensionFromTemplateType(templateType: string): string {
    if (templateType.includes('yaml')) return 'yaml';
    if (templateType.includes('json')) return 'json';
    return 'tf';
  }

  async storeOriginalContent(
    userId: string,
    fileId: string,
    content: string,
    fileType: string,
  ): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const s3Client = this.awsConfig.createS3Client();
    const s3Locations = this.getS3Locations(userId, fileId);

    try {
      if (fileType.startsWith('image/')) {
        const base64Data = content.split(';base64,')[1] || content;
        const buffer = Buffer.from(base64Data, 'base64');

        const upload = new Upload({
          client: s3Client,
          params: {
            Bucket: this.config.bucket,
            Key: s3Locations.originalContent,
            Body: buffer,
            ContentType: fileType,
          },
        });

        await upload.done();
      } else {
        const upload = new Upload({
          client: s3Client,
          params: {
            Bucket: this.config.bucket,
            Key: s3Locations.originalContent,
            Body: content,
            ContentType: fileType,
          },
        });

        await upload.done();
      }
    } catch (error) {
      this.logger.error('Error storing original content:', error);
      throw new Error('Failed to store original content');
    }
  }

  async getOriginalContent(
    userId: string,
    fileId: string,
    forDownload: boolean = false
  ): Promise<{ data: string | Buffer; contentType: string }> {
    if (!this.config.enabled) {
      throw new Error('Storage is not enabled');
    }

    const s3Client = this.awsConfig.createS3Client();
    const s3Locations = this.getS3Locations(userId, fileId);

    try {
      const result = await s3Client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: s3Locations.originalContent,
        }),
      );

      const contentType = result.ContentType || 'application/octet-stream';
      const response = await result.Body.transformToByteArray();

      // For downloads, return the raw buffer
      if (forDownload) {
        return {
          data: Buffer.from(response),
          contentType,
        };
      }

      // For loading into the application
      if (contentType.startsWith('image/')) {
        // Always return image content as base64 data URL
        const base64Data = Buffer.from(response).toString('base64');
        return {
          data: `data:${contentType};base64,${base64Data}`,
          contentType,
        };
      } else {
        // For text content (IaC templates), return as string
        return {
          data: Buffer.from(response).toString('utf-8'),
          contentType,
        };
      }
    } catch (error) {
      this.logger.error('Error getting original content:', error);
      throw new Error('Failed to get original content');
    }
  }
}