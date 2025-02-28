import { Module } from '@nestjs/common';
import { WellArchitectedService } from './well-architected.service';
import { WellArchitectedController } from './well-architected.controller';
import { AwsConfigService } from '../../config/aws.config';

@Module({
  providers: [WellArchitectedService, AwsConfigService],
  controllers: [WellArchitectedController],
  exports: [WellArchitectedService],
})
export class WellArchitectedModule {}