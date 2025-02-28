import { Injectable, Logger } from '@nestjs/common';
import { AwsConfigService } from '../../config/aws.config';
import { GetLensReviewReportCommand } from '@aws-sdk/client-wellarchitected';

interface AnalysisResult {
  pillar: string;
  question: string;
  bestPractices: {
    name: string;
    applied: boolean;
    reasonApplied?: string;
    reasonNotApplied?: string;
    recommendations?: string;
  }[];
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);
  private readonly lensAlias = 'wellarchitected';

  constructor(private readonly awsConfig: AwsConfigService) {}

  async generateReport(workloadId: string) {
    try {
      const waClient = this.awsConfig.createWAClient();
      const command = new GetLensReviewReportCommand({
        WorkloadId: workloadId,
        LensAlias: this.lensAlias,
      });

      const response = await waClient.send(command);
      return response.LensReviewReport?.Base64String;
    } catch (error) {
      this.logger.error('Error generating report:', error);
      throw new Error(error);
    }
  }

  generateRecommendationsCsv(results: AnalysisResult[]): string {
    try {
      const rows = [
        ['Pillar', 'Question', 'Best Practice', 'Applied', 'Reason', 'Recommendations'],
      ];

      for (const result of results) {
        for (const bp of result.bestPractices) {
          rows.push([
            result.pillar,
            result.question,
            bp.name,
            bp.applied ? 'Yes' : 'No',
            bp.applied ? (bp.reasonApplied || '') : (bp.reasonNotApplied || ''),
            bp.recommendations || '',
          ]);
        }
      }

      return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    } catch (error) {
      this.logger.error('Error generating recommendations CSV:', error);
      throw new Error(error);
    }
  }
}