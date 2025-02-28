import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { WellArchitectedService } from './well-architected.service';
import { CreateMilestoneDto } from '../../shared/dto/analysis.dto';

@Controller('well-architected')
export class WellArchitectedController {
  private readonly logger = new Logger(WellArchitectedController.name);

  constructor(private readonly waService: WellArchitectedService) { }

  @Get('review/:workloadId')
  async getLensReview(@Param('workloadId') workloadId: string) {
    try {
      return await this.waService.getLensReview(workloadId);
    } catch (error) {
      this.logger.error(`Failed to get lens review for workload ${workloadId}:`, error);
      throw new HttpException(
        `Failed to retrieve workload review: ${error.message || error}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('risk-summary/:workloadId')
  async getRiskSummary(@Param('workloadId') workloadId: string) {
    try {
      return await this.waService.getRiskSummary(workloadId);
    } catch (error) {
      this.logger.error(`Failed to get risk summary for workload ${workloadId}:`, error);
      throw new HttpException(
        `Failed to retrieve risk summary: ${error.message || error}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('milestone')
  async createMilestone(@Body() createMilestoneDto: CreateMilestoneDto) {
    try {
      return await this.waService.createMilestone(
        createMilestoneDto.workloadId,
        createMilestoneDto.milestoneName
      );
    } catch (error) {
      this.logger.error('Failed to create milestone:', error);
      throw new HttpException(
        `Failed to create milestone: ${error.message || error}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('answer/:workloadId')
  async updateAnswer(
    @Param('workloadId') workloadId: string,
    @Body() body: { questionId: string; selectedChoices: string[] }
  ) {
    try {
      return await this.waService.updateAnswer(
        workloadId,
        body.questionId,
        body.selectedChoices
      );
    } catch (error) {
      this.logger.error(`Failed to update answer for workload ${workloadId}, for question ${body.questionId}:`, error);
      throw new HttpException(
        `Failed to update answer: ${error.message || error}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('workload/create')
  async createWorkload(@Body() body: { isTemp: boolean }) {
    try {
      return await this.waService.createWorkload(body.isTemp);
    } catch (error) {
      this.logger.error('Failed to create workload:', error);
      throw new HttpException(
        `Failed to create workload: ${error.message || error}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('workload/:workloadId')
  async deleteWorkload(@Param('workloadId') workloadId: string) {
    try {
      await this.waService.deleteWorkload(workloadId);
    } catch (error) {
      this.logger.error(`Failed to delete workload ${workloadId}:`, error);
      throw new HttpException(
        `Failed to delete workload: ${error.message || error}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}