// deals-matching.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class DealsMatchingService {
  private readonly logger = new Logger(DealsMatchingService.name);
  private openai: OpenAI;
  private readonly GATE_MIN_FINANCIAL_SCORE = 35;
  private readonly MAX_MATCHES = 355;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async runMatchingForDeal(dealId: string): Promise<any> {
    this.logger.log('[Matching] Starting for deal ' + dealId);
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId }, include: { comps: true, dealSource: true } });
    if (!deal) throw new Error('Deal ' + dealId + ' not found');

    const gateResult = this.runFinancialGate(deal);
    if (!gateResult.passes) {
      await this.prisma.deal.update({ where: { id: dealId }, data: { matchedBuyerCount: 0, tier1MatchCount: 0, buyerDemandScore: 0, nextBestAction: gateResult.recommendation, buyerCoverageStatus: 'Not Ready' } as any });
      return { dealId, dealAddress: deal.address, gateResult, matches: [], totalBuyersScanned: 0, matchCount: 0, tier1Count: 0, runAt: new Date().toISOString(), aiSummary: 'Deal did not pass financial quality gate. ' + gateResult.gateReason };
    }

    const allBuyers = await this.prisma.buyer.findMany({ where: { isActive: true, isSuspended: false }, include: { buyBox: true } });
    const candidateBuyers = this.preFilterBuyers(allBuyers, deal);
    this.logger.log('[Matching] ' + candidateBuyers.length + ' candidates from ' + allBuyers.length + ' total');

    const matches: any[] = [];
    for (const buyer of candidateBuyers.slice(0, this.MAX_MATCHES)) {
      try {
        const match = await this.aiScoreBuyer(buyer, deal);
        if (match.matchScore >= 25) matches.push(match);
      } catch (err: any) {
        this.logger.warn('[Matching] AI failed for buyer ' + buyer.id + ': ' + err.message);
      }
    }

    matches.sort((a, b) => b.matchScore - a.matchScore);
    matches.forEach((m, i) => { m.rank = i + 1; });

    const aiSummary = this.generateMatchSummary(deal, matches);
    await this.persistResults(dealId, matches);

    const tier1Count = matches.filter(m => m.tier === 'TIER_1' || m.tier === 'VIP').length;
    const buyerDemandScore = Math.min(100, matches.length * 4);
    await this.prisma.deal.update({ where: { id: dealId }, data: { matchedBuyerCount: matches.length, tier1MatchCount: tier1Count, buyerDemandScore, sniperScore: this.calculateSniperScore(matches, deal), status: matches.length > 0 ? 'MATCHED' as any : deal.status, buyerCoverageStatus: this.getBuyerCoverageStatus(matches.length, tier1Count), nextBestAction: matches.length > 0 ? 'Send buyer blast' : 'Find buyers for this market' } as any });

    return { dealId, dealAddress: deal.address, gateResult, matches, totalBuyersScanned: candidateBuyers.length, matchCount: matches.length, tier1Count, runAt: new Date().toISOString(), aiSummary };
  }

  private runFinancialGate(deal: any): any {
    let score = 0;
    const dataGaps: string[] = [];
    let gateReason = '';
    const refValue = deal.arv || deal.zillowEstimate || deal.realtorEstimate || deal.rentcastEstimate;
    const price = deal.askingPrice || deal.buyerFacingPrice || 0;

    if (refValue && price) {
      const ratio = price / refValue;
      if (ratio <= 0.60) score += 45;
      else if (ratio <= 0.65) score += 38;
      else if (ratio <= 0.70) score += 30;
      else if (ratio <= 0.75) score += 20;
      else if (ratio <= 0.80) score += 10;
      else if (ratio <= 0.85) score += 4;
      else gateReason = 'Price is ' + Math.round(ratio * 100) + '% of value — not enough discount';
    } else if (!refValue) {
      score += 15;
      dataGaps.push('ARV or public value estimate missing');
    }

    const dealType = (deal.dealType || '').toUpperCase();
    if (dealType === 'SUBTO') score += 20;
    else if (['WHOLESALE', 'OWNER_FINANCE', 'NOVATION'].includes(dealType)) score += 15;
    else if (dealType) score += 8;
    else dataGaps.push('Deal type not specified');

    if (deal.sourceType === 'OWN') score += 20;
    else if (deal.dealSource && deal.dealSource.reliabilityLabel === 'BLACKLIST') { score -= 50; gateReason = 'Source is blacklisted'; }
    else score += 10;

    if (deal.address && deal.city && deal.state) score += 10; else dataGaps.push('Full address incomplete');
    if (deal.beds && deal.baths) score += 5; else dataGaps.push('Beds/baths missing');
    if (!deal.photos || !deal.photos.length) dataGaps.push('No photos — add before buyer blast');
    if (!deal.repairEstimate) dataGaps.push('Repair estimate missing');
    if (!deal.accessInfo) dataGaps.push('Access info missing');

    const financialScore = Math.max(0, Math.min(100, score));
    const passes = financialScore >= this.GATE_MIN_FINANCIAL_SCORE && !(deal.dealSource && deal.dealSource.reliabilityLabel === 'BLACKLIST');
    const dataCompletenessScore = Math.round(((deal.address?1:0)+(deal.beds?1:0)+(deal.baths?1:0)+(deal.sqft?1:0)+(deal.repairEstimate?1:0)+((deal.photos && deal.photos.length)?1:0)+(deal.accessInfo?1:0)+(deal.arv?1:0))/8*100);
    if (passes && !gateReason) gateReason = 'Financial score ' + financialScore + '/100 — qualifies for matching';

    return { passes, financialScore, dataCompletenessScore, gateReason, dataGaps, recommendation: passes ? (dataGaps.length > 0 ? 'Good deal — fill in: ' + dataGaps.slice(0,2).join(', ') : 'Ready to blast buyers') : 'Not ready: ' + gateReason };
  }

  private preFilterBuyers(buyers: any[], deal: any): any[] {
    const price = deal.askingPrice || deal.buyerFacingPrice || 0;
    const dealState = (deal.state || '').toUpperCase();
    const dealCity = (deal.city || '').toLowerCase();

    return buyers.filter(buyer => {
      const bb = buyer.buyBox;

      // RULE 1: If buyer has states in buyBox, deal state MUST be in that list. Hard stop.
      if (bb && bb.states && bb.states.length > 0) {
        const stateMatch = bb.states.some((s: string) => s.toUpperCase() === dealState);
        if (!stateMatch) return false;
      } else {
        // RULE 2: No states set — check text fields for city/state match
        const dl = dealState.toLowerCase();
        // Use word boundary for state codes to avoid matching 'fl' in 'flip', 'flexible' etc
        const stateRegex = new RegExp('\\b' + dl + '\\b', 'i');
        const primaryMatch = buyer.marketPrimary && (stateRegex.test(buyer.marketPrimary) || buyer.marketPrimary.toLowerCase().includes(dealCity));
        const summaryMatch = buyer.aiSummary && (stateRegex.test(buyer.aiSummary) || buyer.aiSummary.toLowerCase().includes(dealCity));
        const intelMatch = buyer.buyerIntelNotes && (stateRegex.test(buyer.buyerIntelNotes) || buyer.buyerIntelNotes.toLowerCase().includes(dealCity));
        const hasSignals = !!(buyer.marketPrimary || buyer.aiSummary || buyer.buyerIntelNotes);
        // No geo signals at all = exclude. Has signals but none match = exclude.
        if (!hasSignals || (!primaryMatch && !summaryMatch && !intelMatch)) return false;
      }

      // Price filters
      if (bb && bb.maxPrice && price > 0 && price > bb.maxPrice * 1.5) return false;
      if (bb && bb.minPrice && price > 0 && price < bb.minPrice * 0.5) return false;
      return true;
    });
  }

  private async aiScoreBuyer(buyer: any, deal: any): Promise<any> {
    const bb = buyer.buyBox;
    const buyBoxSummary = [
      bb && bb.states && bb.states.length ? 'Markets: ' + bb.states.join(', ') : null,
      bb && bb.minPrice || bb && bb.maxPrice ? 'Price: $' + (bb.minPrice || 0).toLocaleString() + ' - $' + (bb.maxPrice ? bb.maxPrice.toLocaleString() : 'open') : null,
      bb && bb.investmentStrategy && bb.investmentStrategy.length ? 'Strategies: ' + bb.investmentStrategy.join(', ') : null,
      buyer.preferredStrategies && buyer.preferredStrategies.length ? 'Preferred: ' + buyer.preferredStrategies.join(', ') : null,
      buyer.marketPrimary ? 'Primary market: ' + buyer.marketPrimary : null,
      buyer.dealBreakers && buyer.dealBreakers.length ? 'Deal breakers: ' + buyer.dealBreakers.join(', ') : null,
    ].filter(Boolean).join('\n');

    const refValue = deal.arv || deal.zillowEstimate || deal.realtorEstimate;
    const price = deal.askingPrice || 0;
    const discount = refValue ? Math.round((1 - price/refValue)*100) + '% below ARV' : 'unknown discount';

    const prompt = 'You are a wholesale real estate dispositions expert. Evaluate if this buyer is a good match for this deal.\n\nDEAL:\n' +
      deal.address + ', ' + deal.city + ', ' + deal.state + ' ' + deal.zipCode + '\n' +
      'Deal type: ' + (deal.dealType || 'not specified') + '\n' +
      'Asking: $' + price.toLocaleString() + ' (' + discount + ')\n' +
      (deal.arv ? 'ARV: $' + deal.arv.toLocaleString() + '\n' : '') +
      (deal.beds && deal.baths ? deal.beds + 'bd/' + deal.baths + 'ba\n' : '') +
      (deal.sqft ? deal.sqft.toLocaleString() + ' sqft\n' : '') +
      (deal.yearBuilt ? 'Built ' + deal.yearBuilt + '\n' : '') +
      (deal.overallCondition ? 'Condition: ' + deal.overallCondition + '\n' : '') +
      (deal.rentEstimate ? 'Rent estimate: $' + deal.rentEstimate.toLocaleString() + '/mo\n' : '') +
      (deal.sellerNotes ? 'Seller notes: ' + deal.sellerNotes + '\n' : '') +
      (deal.aiVerdict ? 'AI verdict: ' + deal.aiVerdict + '\n' : '') +
      '\nBUYER:\n' +
      buyer.firstName + ' ' + buyer.lastName + (buyer.company ? ' / ' + buyer.company : '') + '\n' +
      'Tier: ' + buyer.tier + ' | Type: ' + buyer.investorType + '\n' +
      (buyer.hasCash ? 'Has cash\n' : '') +
      (buyer.hasHardMoney ? 'Has hard money\n' : '') +
      'Scores: Reliability ' + buyer.reliabilityScore + ' | Liquidity ' + buyer.liquidityScore + ' | Activity ' + buyer.activityScore + '\n' +
      (buyer.aiSummary ? 'Buyer Intelligence Report:\n' + buyer.aiSummary + '\n' : '') +
      (buyer.aiBuyerProfile && !buyer.aiSummary ? 'Buyer Profile:\n' + buyer.aiBuyerProfile + '\n' : '') +
      (buyer.buyerIntelNotes ? 'Intel Notes:\n' + buyer.buyerIntelNotes + '\n' : '') +
      (buyer.temperatureNotes ? 'Current Status: ' + buyer.temperatureNotes + '\n' : '') +
      'Buy box:\n' + (buyBoxSummary || 'Not filled in') +
      '\n\nRespond ONLY with valid JSON:\n{"matchScore":<0-100>,"matchStrength":"<STRONG|MODERATE|WEAK>","matchReasoning":"<2-3 sentences referencing actual numbers>","redFlags":["<concern>"],"outreachAngle":"<one sentence pitch angle>","estimatedOfferRange":"<e.g. $85k-$92k>"}\n\n80-100: near perfect. 60-79: good. 40-59: moderate. 20-39: weak. 0-19: no match.';

    const response = await this.openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 400, temperature: 0.2 });
    let result: any = {};
    try { result = JSON.parse((response.choices[0]?.message?.content || '{}').replace(/```json|```/g, '').trim()); } catch { result = { matchScore: 0, matchStrength: 'WEAK', matchReasoning: 'AI scoring failed', redFlags: [], outreachAngle: '', estimatedOfferRange: 'unknown' }; }

    return { buyerId: buyer.id, buyerName: (buyer.firstName + ' ' + buyer.lastName).trim(), tier: buyer.tier, phone: buyer.phone, email: buyer.email, company: buyer.company, investorType: buyer.investorType, compositeScore: buyer.compositeScore || 50, matchScore: Math.max(0, Math.min(100, result.matchScore || 0)), matchStrength: result.matchStrength || 'WEAK', matchReasoning: result.matchReasoning || '', redFlags: result.redFlags || [], outreachAngle: result.outreachAngle || '', estimatedOfferRange: result.estimatedOfferRange || 'unknown', rank: 0, buyBoxSummary };
  }

  private generateMatchSummary(deal: any, matches: any[]): string {
    if (matches.length === 0) return 'No buyers matched for ' + deal.address + '. Consider expanding your buyer list for ' + deal.state + '.';
    const strong = matches.filter(m => m.matchStrength === 'STRONG');
    return ['Found ' + matches.length + ' matched buyers for ' + deal.address + ', ' + deal.city + ' ' + deal.state + '.', strong.length > 0 ? strong.length + ' strong match' + (strong.length > 1 ? 'es' : '') + ': ' + strong.slice(0,3).map((m: any) => m.buyerName).join(', ') + '.' : null, matches[0] ? 'Top match: ' + matches[0].buyerName + ' (' + matches[0].matchScore + '/100).' : null].filter(Boolean).join(' ');
  }

  private async persistResults(dealId: string, matches: any[]) {
    await this.prisma.matchResult.deleteMany({ where: { dealId } });
    if (matches.length === 0) return;
    await this.prisma.$transaction(matches.map(m => this.prisma.matchResult.create({ data: { dealId, buyerId: m.buyerId, finalScore: m.matchScore/100, vectorScore: m.matchScore/100, geoScore: m.matchScore/100, priceScore: m.matchScore/100, reliabilityScore: m.compositeScore/100, activityScore: m.matchScore/100, historicalScore: m.matchScore/100, rank: m.rank, confidencePct: m.matchScore } })));
  }

  async getMatchesForDeal(dealId: string, limit = 50) {
    return this.prisma.matchResult.findMany({ where: { dealId }, orderBy: { rank: 'asc' }, take: limit, include: { buyer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, tier: true, investorType: true, reliabilityScore: true, liquidityScore: true, activityScore: true, compositeScore: true, marketPrimary: true, marketSecondary: true, preferredStrategies: true, buyerIntelNotes: true, aiSummary: true, dealBreakers: true, hasCash: true, hasHardMoney: true, buyBox: { select: { states: true, zipCodes: true, minPrice: true, maxPrice: true, propertyTypes: true, investmentStrategy: true, rehabTolerance: true } } } } } });
  }

  private calculateSniperScore(matches: any[], deal: any): number {
    if (matches.length === 0) return 0;
    const top3 = matches.slice(0, 3);
    const avgTopScore = top3.reduce((s: number, m: any) => s + (m.matchScore || 0), 0) / top3.length;
    const matchStrengthPts = Math.round((avgTopScore / 100) * 50);
    const dealScore = deal.dealPriorityScore || 0;
    const dealQualityPts = Math.round((dealScore / 100) * 30);
    const avgBuyerQuality = top3.reduce((s: number, m: any) => s + (m.compositeScore || 50), 0) / top3.length;
    const buyerQualityPts = Math.round((avgBuyerQuality / 100) * 20);
    return Math.min(100, matchStrengthPts + dealQualityPts + buyerQualityPts);
  }

  runFinancialGateOnly(deal: any): any { return this.runFinancialGate(deal); }

  private getBuyerCoverageStatus(matchCount: number, tier1Count: number): string {
    if (matchCount >= 10 && tier1Count >= 2) return 'Strong Coverage';
    if (matchCount >= 5 || tier1Count >= 1) return 'Moderate Coverage';
    if (matchCount >= 2) return 'Weak Coverage';
    if (matchCount >= 1) return 'Minimal Coverage';
    return 'Buyer Gap';
  }
}