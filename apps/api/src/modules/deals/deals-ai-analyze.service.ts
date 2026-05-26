import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class DealsAiAnalyzeService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
Water Heater: ${(deal as any).waterHeaterCondition || 'unknown'} ${(deal as any).waterHeaterAge ? '('+(deal as any).waterHeaterAge+')' : ''}
HOA: ${deal.hoaStatus || 'unknown'} ${deal.hoaMonthly ? '($'+deal.hoaMonthly+'/mo)' : ''}
Title Issues: ${(deal as any).titleIssuesNotes || 'none noted'}
Code Violations: ${deal.codeIssues ? ((deal as any).codeViolationDetails || 'yes') : 'none'}
Unpermitted Additions: ${(deal as any).unpermittedAdditions || 'none noted'}
Deal Notes: ${deal.conditionNotes || 'none'}
Description: ${deal.description || 'none'}

Return this exact JSON:
{
  "verdict": "STRONG",
  "verdictReason": "one sentence why",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "redFlags": ["flag 1"],
  "buyerProfile": "one sentence describing ideal buyer",
  "pitch": "2-3 sentence buyer-facing pitch",
  "dispoScoreBonus": 10,
  "dealScoreBonus": 15,
  "sellabilityNotes": "one sentence on how fast this will move"
}

verdict must be one of: STRONG, POSSIBLE, RISKY, PASS
dispoScoreBonus: integer -20 to +20
dealScoreBonus: integer -25 to +25`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    await this.prisma.deal.update({
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
      } as any,
    });

    return { ...result, dealId };
  }
}
