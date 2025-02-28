import { Injectable, Logger } from '@nestjs/common';
import { AwsConfigService } from '../../config/aws.config';
import {
  GetLensReviewCommand,
  ListAnswersCommand,
  UpdateAnswerCommand,
  CreateMilestoneCommand,
  CreateWorkloadCommand,
  DeleteWorkloadCommand,
} from '@aws-sdk/client-wellarchitected';
import { randomBytes, randomUUID } from 'crypto';

@Injectable()
export class WellArchitectedService {
  private readonly logger = new Logger(WellArchitectedService.name);
  private readonly lensAlias = 'wellarchitected';

  constructor(private readonly awsConfig: AwsConfigService) { }

  async getLensReview(workloadId: string) {
    const waClient = this.awsConfig.createWAClient();
    const command = new GetLensReviewCommand({
      WorkloadId: workloadId,
      LensAlias: this.lensAlias,
    });

    try {
      return await waClient.send(command);
    } catch (error) {
      this.logger.error(`Error getting lens review for workload ${workloadId}:`, error);
      throw new Error(error);
    }
  }

  async listAnswers(workloadId: string, pillarId: string) {
    const waClient = this.awsConfig.createWAClient();
    const command = new ListAnswersCommand({
      WorkloadId: workloadId,
      LensAlias: this.lensAlias,
      PillarId: pillarId,
    });

    try {
      return await waClient.send(command);
    } catch (error) {
      this.logger.error(`Error listing answers for workload ${workloadId}:`, error);
      throw new Error(error);
    }
  }

  async updateAnswer(workloadId: string, questionId: string, selectedChoices: string[]) {
    const waClient = this.awsConfig.createWAClient();
    const command = new UpdateAnswerCommand({
      WorkloadId: workloadId,
      LensAlias: this.lensAlias,
      QuestionId: questionId,
      SelectedChoices: selectedChoices,
      Notes: 'Updated from WA IaC Analyzer app',
    });

    try {
      return await waClient.send(command);
    } catch (error) {
      this.logger.error(`Error updating answer for workload ${workloadId}:`, error);
      throw new Error(error);
    }
  }

  async createMilestone(workloadId: string, milestoneName: string) {
    const waClient = this.awsConfig.createWAClient();
    const command = new CreateMilestoneCommand({
      WorkloadId: workloadId,
      MilestoneName: milestoneName,
    });

    try {
      return await waClient.send(command);
    } catch (error) {
      this.logger.error(`Error creating milestone for workload ${workloadId}:`, error);
      throw new Error(error);
    }
  }

  async getRiskSummary(workloadId: string) {
    try {
      const review = await this.getLensReview(workloadId);
      const summaries = [];

      for (const pillarSummary of review.LensReview?.PillarReviewSummaries || []) {
        const answers = await this.listAnswers(workloadId, pillarSummary.PillarId!);

        const summary = {
          pillarName: pillarSummary.PillarName!,
          totalQuestions: 0,
          answeredQuestions: 0,
          highRisks: 0,
          mediumRisks: 0,
        };

        for (const answer of answers.AnswerSummaries || []) {
          summary.totalQuestions++;
          if (answer.Risk !== 'UNANSWERED') {
            summary.answeredQuestions++;
            if (answer.Risk === 'HIGH') summary.highRisks++;
            if (answer.Risk === 'MEDIUM') summary.mediumRisks++;
          }
        }

        summaries.push(summary);
      }

      return summaries;
    } catch (error) {
      this.logger.error(`Error getting risk summary for workload ${workloadId}:`, error);
      throw new Error(error);
    }
  }

  private generateRandomString(length: number): string {
    return randomBytes(length / 2).toString('hex');
  }

  async createWorkload(isTemp: boolean = false): Promise<string> {
    const waClient = this.awsConfig.createWAClient();
    
    const now = new Date();
    const timestamp = now.toLocaleString('en-AU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    }).replace(/[/,:]/g, '').replace(/\s/g, '_');
    const randomString = this.generateRandomString(10);

    const workloadName = isTemp
      ? `DO_NOT_DELETE_temp_IaCAnalyzer_${randomString}`
      : `IaCAnalyzer_${timestamp}_UTC_${randomString}`;

    const command = new CreateWorkloadCommand({
      WorkloadName: workloadName,
      Description: isTemp ? 'Temporary workload for IaC Analyzer' : 'IaC Analyzer workload',
      Environment: 'PREPRODUCTION',
      ReviewOwner: 'IaC Analyzer',
      Lenses: ['wellarchitected'],
      NonAwsRegions: ['global'],
      Tags: {
        'WorkloadName': workloadName
      }
    });

    try {
      const response = await waClient.send(command);
      return response.WorkloadId!;
    } catch (error) {
      this.logger.error(`Error creating workload: ${error}`);
      throw new Error(error);
    }
  }

  async deleteWorkload(workloadId: string): Promise<void> {
    const waClient = this.awsConfig.createWAClient();
    const command = new DeleteWorkloadCommand({
      WorkloadId: workloadId,
      ClientRequestToken: randomUUID()
    });

    try {
      await waClient.send(command);
    } catch (error) {
      this.logger.error(`Error deleting workload: ${error}`);
      throw new Error(error);
    }
  }
}