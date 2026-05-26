import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class DealsAiAnalyzeService {
  private anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  constructor(private prisma: PrismaService) {}

  async analyzeDeal(dealId: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new Error('Deal not found');

    const prompt = `You are an expert wholesale real estate analyst. Analyze this deal and return ONLY valid JSON, no other text.

DEAL DATA:
Address: ${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}
Asking Price: $${deal.askingPrice || 'unknown'}
ARV: $${deal.arv || 'unknown'}
Repairs: $${deal.repairEstimate || 'unknown'}
Deal Type: ${deal.dealType || 'WHOLESALE'}
Zestimate: $${deal.zillowEstimate || 'unknown'}
Beds/Baths: ${deal.beds || '?'}bd / ${deal.baths || '?'}ba
Sqft: ${deal.sqft || 'unknown'}
Year Built: ${deal.yearBuilt || 'unknown'}
Occupancy: ${deal.occupancy || 'unknown'}
Overall Condition: ${deal.overallCondition || 'unknown'}
Roof: ${deal.roofCondition || 'unknown'} ${deal.roofAge ? '('+deal.roofAge+')' : ''}
HVAC: ${deal.hvacCondition || 'unknown'} ${deal.hvacAge ? '('+deal.hvacAge+')' : ''}
Foundation: ${deal.foundationCondition || 'unknown'}
Water Heater: ${deal.waterHeaterCondition || 'unknown'} ${deal.waterHeaterAge ? '('+deal.waterHeaterAge+')' : ''}
HOA: ${deal.hoaStatus || 'unknown'} ${deal.hoaMonthly ? '($'+deal.hoaMonthly+'/mo)' : ''}
Title Issues: ${deal.titleIssuesNotes || 'none noted'}
Code Violations: ${deal.codeIssues ? (deal.codeViolationDetails || 'yes') : 'none'}
Unpermitted Additions: ${deal.unpermittedAdditions || 'none noted'}
Condition Notes / Deal Notes: ${deal.conditionNotes || 'none'}
Description: ${deal.description || 'none'}

Return this exact JSON structure:
{
  "verdict": "STRONG" | "POSSIBLE" | "RISKY" | "PASS",
  "verdictReason": "one sentence why",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "redFlags": ["flag 1", "flag 2"],
  "buyerProfile": "one sentence describing the ideal buyer for this deal",
  "pitch": "2-3 sentence buyer-facing pitch for this deal",
  "dispoScoreBonus": number between -20 and +20 (positive if easy to sell, negative if hard),
  "dealScoreBonus": number between -25 and +25 (positive if strong numbers, negative if weak),
  "sellabilityNotes": "one sentence on how fast/easy this will move"
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    // Save to deal
    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        aiVerdict: result.verdict,
        aiStrengths: result.strengths,
        aiRedFlags: result.redFlags,
        aiBuyerProfile: result.buyerProfile,
        aiPitch: result.pitch,
        aiDispoScoreBonus: result.dispoScoreBonus || 0,
        aiDealScoreBonus: result.dealScoreBonus || 0,
        aiAnalyzedAt: new Date(),
        aiAnalysis: result,
      },
    });

    return { ...result, dealId };
  }
}
