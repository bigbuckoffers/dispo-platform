// ADD THESE ROUTES TO YOUR existing deals.controller.ts
// apps/api/src/modules/deals/deals.controller.ts

// Add these imports at the top:
// import { DealsScoringService } from './deals-scoring.service';
// import { DealsAiParserService } from './deals-ai-parser.service';

// =============================================
// PASTE THESE ROUTE HANDLERS INTO THE CONTROLLER
// =============================================

  @Get('market-intelligence')
  @ApiOperation({ summary: 'Get market demand intelligence — deals vs buyer coverage by market' })
  async getMarketIntelligence(@Query('orgId') orgId?: string) {
    const deals = await this.prisma.deal.findMany({
      where: { status: { notIn: ['DEAD', 'CLOSED'] } },
      select: {
        id: true, city: true, state: true, zipCode: true, county: true,
        marketKey: true, askingPrice: true, arv: true, repairEstimate: true,
        spread: true, dealPriorityScore: true, matchedBuyerCount: true,
        tier1MatchCount: true, buyerDemandScore: true, buyerGapScore: true,
        buyerCoverageStatus: true, marketBuyerNeedRecommendation: true,
        status: true, propertyType: true, dealType: true,
      },
    });

    // Aggregate by market
    const marketMap = new Map<string, any>();
    for (const d of deals) {
      const key = d.marketKey || `${d.city || 'Unknown'}, ${d.state || ''}`;
      if (!marketMap.has(key)) {
        marketMap.set(key, {
          market: key,
          city: d.city,
          state: d.state,
          activeDealCount: 0,
          totalEstimatedSpread: 0,
          avgDealScore: 0,
          dealScores: [],
          totalMatchedBuyers: 0,
          totalTier1Buyers: 0,
          maxBuyerGapScore: 0,
          weakCoverageCount: 0,
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
      if (['Weak Coverage', 'Buyer Gap'].includes(d.buyerCoverageStatus || '')) m.weakCoverageCount++;
      if (d.marketBuyerNeedRecommendation) m.recommendation = d.marketBuyerNeedRecommendation;
    }

    const markets = Array.from(marketMap.values()).map(m => ({
      ...m,
      averageDealScore: m.dealScores.length > 0 ? Math.round(m.dealScores.reduce((a: number, b: number) => a + b, 0) / m.dealScores.length) : 0,
      buyerCoverageStatus: m.totalMatchedBuyers >= 15 && m.totalTier1Buyers >= 3 ? 'Strong Coverage' :
        m.totalMatchedBuyers >= 8 || m.totalTier1Buyers >= 1 ? 'Moderate Coverage' :
        m.totalMatchedBuyers >= 1 ? 'Weak Coverage' : 'Buyer Gap',
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

  @Post(':id/parse')
  @ApiOperation({ summary: 'Re-parse deal from raw text' })
  async parseDeal(@Param('id') id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal?.rawInputText) throw new Error('No raw text to parse');
    const parsed = await this.aiParser.parseDealText(deal.rawInputText, deal.sourceType || 'MANUAL');
    const metrics = this.scoringService.calculateMetrics({ ...deal, ...parsed });
    return this.prisma.deal.update({
      where: { id },
      data: { ...parsed, ...metrics, status: parsed.suggestedStatus || deal.status },
    });
  }

  @Post(':id/calculate-metrics')
  @ApiOperation({ summary: 'Recalculate deal scores and metrics' })
  async calculateMetrics(@Param('id') id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new Error('Deal not found');
    const metrics = this.scoringService.calculateMetrics(deal);
    const mathSummary = await this.aiParser.generateDealMathSummary({ ...deal, ...metrics });
    return this.prisma.deal.update({
      where: { id },
      data: { ...metrics, aiDealMathSummary: mathSummary },
    });
  }

  @Post(':id/generate-follow-up')
  @ApiOperation({ summary: 'Generate follow-up message for missing info' })
  async generateFollowUp(@Param('id') id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new Error('Deal not found');
    const metrics = this.scoringService.calculateMetrics(deal);
    const message = await this.aiParser.generateFollowUpMessage({ ...deal, missingInfo: metrics.missingInfo });
    await this.prisma.deal.update({ where: { id }, data: { missingInfo: metrics.missingInfo } });
    return { message, missingInfo: metrics.missingInfo };
  }

  @Post(':id/match-buyers')
  @ApiOperation({ summary: 'Run AI buyer matching for this deal' })
  async matchBuyers(@Param('id') id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new Error('Deal not found');

    // Basic matching: find buyers whose buy box overlaps with the deal
    const buyers = await this.prisma.buyer.findMany({
      where: { isActive: true },
      include: { buyBox: true },
    });

    let matched = 0;
    let tier1 = 0;

    for (const buyer of buyers) {
      if (!buyer.buyBox) continue;
      const bb = buyer.buyBox as any;

      // State match
      const stateMatch = !bb.states?.length || bb.states.includes(deal.state);
      // Price match
      const price = deal.askingPrice || deal.buyerFacingPrice || 0;
      const priceMatch = (!bb.minPrice || price >= bb.minPrice) && (!bb.maxPrice || price <= bb.maxPrice);

      if (stateMatch && priceMatch) {
        matched++;
        if (buyer.tier === 'TIER_1') tier1++;
      }
    }

    const buyerDemandScore = Math.min(100, matched * 5);
    const { status, gapScore, recommendation } = (this.scoringService as any).calcBuyerCoverage(
      { ...deal, matchedBuyerCount: matched, tier1MatchCount: tier1 },
      deal.dealPriorityScore || 0
    );

    return this.prisma.deal.update({
      where: { id },
      data: {
        matchedBuyerCount: matched,
        tier1MatchCount: tier1,
        buyerDemandScore,
        buyerCoverageStatus: status,
        buyerGapScore: gapScore,
        marketBuyerNeedRecommendation: recommendation,
        status: matched > 0 ? 'MATCHED' : deal.status,
      },
    });
  }
