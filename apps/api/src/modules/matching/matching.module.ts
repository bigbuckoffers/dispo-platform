import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MatchingService } from './matching.service';
import { MatchingProcessor } from './matching.processor';
import { MatchingController } from './matching.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'matching' }),
    AiModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingProcessor],
  exports: [MatchingService],
})
export class MatchingModule {}
