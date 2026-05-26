import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { ArvEngineService } from './arv-engine.service';
import { DealsService } from './deals.service';
import { DealsScoringService } from './deals-scoring.service';
import { DealsAiAnalyzeService } from './deals-ai-analyze.service';
import { DealsAiParserService } from './deals-ai-parser.service';
import { MatchingModule } from '../matching/matching.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [MatchingModule, AiModule],
  controllers: [DealsController],
  providers: [
    ArvEngineService,DealsService, DealsScoringService, DealsAiParserService, DealsAiAnalyzeService],
  exports: [DealsService, DealsScoringService],
})
export class DealsModule {}
