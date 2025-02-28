import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  Headers,
} from '@nestjs/common';
import { AnalyzerService } from './analyzer.service';
import { StorageService } from '../storage/storage.service';
import { AnalyzeRequestDto, IaCTemplateType } from '../../shared/dto/analysis.dto';
import { ConfigService } from '@nestjs/config';

@Controller('analyzer')
export class AnalyzerController {
  private readonly logger = new Logger(AnalyzerController.name);

  constructor(
    private readonly analyzerService: AnalyzerService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) { }

  private getUserEmail(userDataHeader: string): string | null {
    // Check if authentication is enabled
    const isAuthEnabled = this.configService.get<boolean>('auth.enabled', false);
    
    if (!isAuthEnabled) {
      // Return default "iac-analyzer" email when auth is disabled
      return 'iac-analyzer';
    }

    // Check if in development mode
    const isDevMode = this.configService.get<boolean>('auth.devMode', false);
    const devEmail = this.configService.get<string>('auth.devEmail');

    if (isDevMode && devEmail) {
      this.logger.debug('Using development mode email:', devEmail);
      return devEmail;
    }

    // Production mode - parse from header
    if (!userDataHeader) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(userDataHeader.split('.')[1], 'base64').toString()
      );
      return payload.email || null;
    } catch (error) {
      this.logger.error('Error parsing user data header:', error);
      return null;
    }
  }

  @Post('analyze')
  async analyze(
    @Body() analyzeRequest: AnalyzeRequestDto,
    @Headers('x-amzn-oidc-data') userDataHeader: string,
  ) {
    try {
      const email = this.getUserEmail(userDataHeader);
      const userId = email ? this.storageService.createUserIdHash(email) : null;

      return await this.analyzerService.analyze(
        analyzeRequest.fileId,
        analyzeRequest.workloadId,
        analyzeRequest.selectedPillars,
        userId,
      );
    } catch (error) {
      this.logger.error('Analysis failed:', error);
      throw new HttpException(
        `Failed to analyze template: ${error.message || error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-iac')
  async generateIacDocument(
    @Body() body: {
      fileId: string;
      recommendations: any[];
      templateType: IaCTemplateType;
    },
    @Headers('x-amzn-oidc-data') userDataHeader: string,
  ) {
    try {
      const email = this.getUserEmail(userDataHeader);
      const userId = email ? this.storageService.createUserIdHash(email) : null;

      const result = await this.analyzerService.generateIacDocument(
        body.fileId,
        body.recommendations,
        body.templateType,
        userId,
      );
      return result;
    } catch (error) {
      this.logger.error('IaC generation failed:', error);
      return {
        content: '',
        isCancelled: false,
        error:
          error instanceof Error ? error.message : 'Failed to generate IaC document',
      };
    }
  }

  @Post('get-more-details')
  async getMoreDetails(@Body() body: {
    selectedItems: any[];
    fileId: string;
    templateType?: IaCTemplateType;
  },
  @Headers('x-amzn-oidc-data') userDataHeader: string,) {
    try {
      const email = this.getUserEmail(userDataHeader);
      const userId = email ? this.storageService.createUserIdHash(email) : null;

      const result = await this.analyzerService.getMoreDetails(
        body.selectedItems,
        userId,
        body.fileId,
        body.templateType
      );
      return result;
    } catch (error) {
      this.logger.error('Getting more details failed:', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Failed to get detailed analysis'
      };
    }
  }

  @Post('cancel-iac-generation')
  async cancelIaCGeneration() {
    this.analyzerService.cancelIaCGeneration();
    return { message: 'Generation cancelled successfully' };
  }

  @Post('cancel-analysis')
  async cancelAnalysis() {
    try {
      this.analyzerService.cancelAnalysis();
      return { message: 'Analysis cancelled' };
    } catch (error) {
      this.logger.error('Failed to cancel analysis:', error);
      throw new HttpException(
        `Failed to cancel analysis: ${error.message || error}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}