import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AiWriterService } from './ai-writer.service';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiWriter: AiWriterService) {}

  @Post('generate-deal-content')
  generateContent(@Body() body: any) {
    return this.aiWriter.generateDealContent(body);
  }

  @Post('analyze-deal')
  analyzeDeal(@Body() body: any) {
    return this.aiWriter.generatePropertyAnalysis(body);
  }

  @Post('generate-campaign')
  generateCampaign(@Body() body: { deal: any; tier: string }) {
    return this.aiWriter.generateCampaignSequence(body.deal, body.tier);
  }
}
