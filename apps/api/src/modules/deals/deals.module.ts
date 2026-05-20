import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { MatchingModule } from '../matching/matching.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [MatchingModule, AiModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
