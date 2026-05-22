// deals.controller.ts
import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TeamRole } from '@prisma/client';
import { Roles, CurrentUser, OrgId } from '../../shared/decorators';
import { DealsService } from './deals.service';
import { DealsScoringService } from './deals-scoring.service';
import { DealsAiParserService } from './deals-ai-parser.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateDealDto } from './dto/create-deal.dto';

@ApiTags('deals')
@ApiBearerAuth()
@Controller('deals')
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly scoringService: DealsScoringService,
    private readonly aiParser: DealsAiParserService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  findAll(@OrgId() orgId: string, @Query() query: any) {
    return this.dealsService.findAll(orgId || 'a296974d-74f4-4c8b-b6f4-5a57b9f36758', query);
  }

  @Get('market-intelligence')
  @ApiOperation({ summary: 'Get market demand intelligence' })
  async getMarketIntelligence() {
    const deals = await this.prisma.deal.findMany({
      where: { status: { notIn: ['DEAD', 'CLOSED'] } },
      select: {
        id: true, city: true, state: true, zipCode: true,
        marketKey: true, spread: true, dealPriorityScore: true,
        matchedBuyerCount: true, tier1MatchCount: true,
        buyerDemandScore: true, buyerGapScore: true,
        buyerCoverageStatus: true, marketBuyerNeedRecommendation: true,
      },
    });

    const marketMap = new Map<string, any>();
    for (const d of deals) {
      const key = d.marketKey || `${d.city || 'Unknown'}, ${d.state || ''}`;
      if (!marketMap.has(key)) {
        marketMap.set(key, {
          market: key, city: d.city, state: d.state,
          activeDealCount: 0, totalEstimatedSpread: 0, dealScores: [],
          totalMatchedBuyers: 0, totalTier1Buyers: 0, maxBuyerGapScore: 0,
          recommendation: d.marketBuyerNeedRecommendation || '',
        });
      }
      const m = marketMap.get(key);
      m.activeDealCount++;
      m.totalEstimatedSpread += d.spread || 0;
      m.dealScores.push(d.dealPriorityScore || 0);
      m.totalMatchedBuyers += d.matchedBuyerCount || 0;
      m.totalTier1Buyers += d.tier1MatchCount || 0;
      m.maxBuyerGapScore = Math.max(m.maxBuyerGapScore, d.buyerGapScore || 0);
      if (d.marketBuyerNeedRecommendation) m.recommendation = d.marketBuyerNeedRecommendation;
    }

    const markets = Array.from(marketMap.values()).map(m => ({
      ...m,
      averageDealScore: m.dealScores.length > 0
        ? Math.round(m.dealScores.reduce((a: number, b: number) => a + b, 0) / m.dealScores.length) : 0,
      buyerCoverageStatus: m.totalMatchedBuyers >= 15 && m.totalTier1Buyers >= 3 ? 'Strong Coverage'
        : m.totalMatchedBuyers >= 8 || m.totalTier1Buyers >= 1 ? 'Moderate Coverage'
        : m.totalMatchedBuyers >= 1 ? 'Weak Coverage' : 'Buyer Gap',
      dealScores: undefined,
    }));

    return {
      byDealCount: [...markets].sort((a, b) => b.activeDealCount - a.activeDealCount).slice(0, 10),
      byTotalSpread: [...markets].sort((a, b) => b.totalEstimatedSpread - a.totalEstimatedSpread).slice(0, 10),
      byBuyerGap: [...markets].sort((a, b) => b.maxBuyerGapScore - a.maxBuyerGapScore).slice(0, 10),
      needingBuyers: markets.filter(m => ['Weak Coverage', 'Buyer Gap'].includes(m.buyerCoverageStatus)).slice(0, 10),
      summary: {
        totalActiveDeals: deals.length,
        marketsWithDeals: markets.length,
        marketsNeedingBuyers: markets.filter(m => ['Weak Coverage', 'Buyer Gap'].includes(m.buyerCoverageStatus)).length,
      },
    };
  }

  @Post('import/raw')
  @ApiOperation({ summary: 'Parse raw deal text with AI' })
  async importRaw(@Body() body: { rawText: string; facebookUrl?: string; sourceType?: string }) {
    const parsed = await this.aiParser.parseDealText(body.rawText, body.sourceType);
    return { ...parsed, rawInputText: body.rawText, facebookPostUrl: body.facebookUrl, sourceType: body.sourceType || 'MANUAL' };
  }

  @Post()
  @ApiOperation({ summary: 'Create deal' })
  async create(@OrgId() orgId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    const metrics = this.scoringService.calculateMetrics(dto);
    const marketKey = `${dto.city || ''}, ${dto.state || ''}`.trim().replace(/^,\s*/, '');
    return this.prisma.deal.create({
      data: {
        organizationId: orgId || 'a296974d-74f4-4c8b-b6f4-5a57b9f36758',
        address: dto.address || 'TBD',
        city: dto.city || '',
        state: dto.state || '',
        zipCode: dto.zipCode || '',
        askingPrice: dto.askingPrice || 0,
        ...dto,
        ...metrics,
        marketKey,
        id: undefined,
        organizationId: orgId || 'a296974d-74f4-4c8b-b6f4-5a57b9f36758',
      },
    });
  }

  @Get(':id')
  findOne(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.dealsService.findOne(orgId || 'a296974d-74f4-4c8b-b6f4-5a57b9f36758', id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update deal' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.prisma.deal.update({ where: { id }, data: dto });
  }

  @Post(':id/parse')
  @ApiOperation({ summary: 'Re-parse deal from raw text' })
  async parseDeal(@Param('id', ParseUUIDPipe) id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal?.rawInputText) return { error: 'No raw text to parse' };
    const parsed = await this.aiParser.parseDealText(deal.rawInputText, deal.sourceType || 'MANUAL');
    const metrics = this.scoringService.calculateMetrics({ ...deal, ...parsed });
    return this.prisma.deal.update({ where: { id }, data: { ...parsed, ...metrics } });
  }

  @Post(':id/calculate-metrics')
  @ApiOperation({ summary: 'Recalculate deal scores' })
  async calculateMetrics(@Param('id', ParseUUIDPipe) id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) return { error: 'Not found' };
    const metrics = this.scoringService.calculateMetrics(deal);
    const mathSummary = await this.aiParser.generateDealMathSummary({ ...deal, ...metrics });
    return this.prisma.deal.update({ where: { id }, data: { ...metrics, aiDealMathSummary: mathSummary } });
  }

  @Post(':id/generate-follow-up')
  @ApiOperation({ summary: 'Generate follow-up message' })
  async generateFollowUp(@Param('id', ParseUUIDPipe) id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) return { error: 'Not found' };
    const metrics = this.scoringService.calculateMetrics(deal);
    const message = await this.aiParser.generateFollowUpMessage({ ...deal, missingInfo: metrics.missingInfo });
    await this.prisma.deal.update({ where: { id }, data: { missingInfo: metrics.missingInfo, missingInfoCount: metrics.missingInfoCount } });
    return { message, missingInfo: metrics.missingInfo };
  }

  @Post(':id/match-buyers')
  @ApiOperation({ summary: 'Run buyer matching' })
  async matchBuyers(@Param('id', ParseUUIDPipe) id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) return { error: 'Not found' };
    const buyers = await this.prisma.buyer.findMany({ where: { isActive: true }, include: { buyBox: true } });
    let matched = 0, tier1 = 0;
    for (const buyer of buyers) {
      if (!buyer.buyBox) continue;
      const bb = buyer.buyBox as any;
      const stateMatch = !bb.states?.length || bb.states.includes(deal.state);
      const price = (deal as any).askingPrice || (deal as any).buyerFacingPrice || 0;
      const priceMatch = (!bb.minPrice || price >= bb.minPrice) && (!bb.maxPrice || price <= bb.maxPrice);
      if (stateMatch && priceMatch) { matched++; if (buyer.tier === 'TIER_1') tier1++; }
    }
    const buyerDemandScore = Math.min(100, matched * 5);
    return this.prisma.deal.update({
      where: { id },
      data: {
        matchedBuyerCount: matched, tier1MatchCount: tier1, buyerDemandScore,
        status: matched > 0 ? 'MATCHED' : (deal.status as string),
      },
    });
  }
}
