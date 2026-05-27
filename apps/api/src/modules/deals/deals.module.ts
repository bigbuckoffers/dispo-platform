import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { ArvEngineService } from './arv-engine.service';
import { DealsService } from './deals.service';
import { DealsScoringService } from './deals-scoring.service';
import { DealsAiAnalyzeService } from './deals-ai-analyze.service';
import { DealsAiParserService } from './deals-ai-parser.service';
import { DealsMatchingService } from './deals-matching.service';
import { MatchingModule } from '../matching/matching.module';
import { RentCastModule } from '../rentcast/rentcast.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [MatchingModule, RentCastModule, AiModule],
  controllers: [DealsController],
  providers: [
    ArvEngineService, DealsService, DealsScoringService,
    DealsAiParserService, DealsAiAnalyzeService, DealsMatchingService,
  ],
  exports: [DealsService, DealsScoringService, DealsMatchingService],
})
export class DealsModule {}
