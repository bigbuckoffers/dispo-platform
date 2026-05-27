import { Module } from '@nestjs/common';
import { BuyersController } from './buyers.controller';
import { BuyersService } from './buyers.service';
import { BuyerIntelligenceService } from './buyer-intelligence.service';

@Module({
  controllers: [BuyersController],
  providers: [BuyersService, BuyerIntelligenceService],
  exports: [BuyersService, BuyerIntelligenceService],
})
export class BuyersModule {}
