// apps/api/src/modules/deals/deals-ai-parser.service.ts
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class DealsAiParserService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async parseDealText(rawText: string, sourceType?: string): Promise<any> {
    const prompt = `You are an expert wholesale real estate deal parser. Extract structured deal data from this raw text.

RAW DEAL TEXT:
"""
${rawText}
"""

SOURCE TYPE: ${sourceType || 'UNKNOWN'}

Extract all available information and return ONLY valid JSON (no markdown, no explanation):

{
  "address": null,
  "city": null,
  "state": null,
  "zipCode": null,
  "county": null,
  "propertyType": null,
  "beds": null,
  "baths": null,
  "sqft": null,
  "yearBuilt": null,
  "occupancy": null,
  "overallCondition": null,
  "accessInfo": null,
  "description": null,
  "askingPrice": null,
  "arv": null,
  "repairEstimate": null,
  "rentEstimate": null,
  "sourceName": null,
  "sourcePhone": null,
  "sourceEmail": null,
  "facebookProfileUrl": null,
  "facebookPostUrl": null,
  "financingAllowed": null,
  "vacantAtClose": null,
  "dealType": null,
  "missingFields": [],
  "confidence": {},
  "suggestedFollowUpQuestions": [],
  "buyerFacingSummary": null,
  "internalSummary": null,
  "suggestedStatus": null,
  "suggestedNextAction": null
}

Rules:
- propertyType options: SFR, DUPLEX, TRIPLEX, QUAD, CONDO, TOWNHOUSE, MOBILE_HOME, LAND, COMMERCIAL, MIXED_USE
- occupancy options: VACANT, OWNER_OCCUPIED, TENANT_OCCUPIED, UNKNOWN
- overallCondition options: TURNKEY, LIGHT_REHAB, MEDIUM_REHAB, HEAVY_REHAB, FULL_GUT, TEAR_DOWN, UNKNOWN
- dealType options: FLIP, RENTAL, SUBTO, CREATIVE, WHOLESALE
- financingAllowed options: CASH_ONLY, HARD_MONEY_OK, CONVENTIONAL_OK, FHA_OK, UNKNOWN
- vacantAtClose: YES, NO, UNKNOWN
- For prices: return numbers only (e.g. 85000 not "$85k")
- For beds/baths: return numbers (e.g. 3, 2)
- confidence: object with field names and 0-100 confidence scores
- missingFields: list of important missing fields by name
- suggestedFollowUpQuestions: 3-5 specific questions to ask the source to fill gaps
- buyerFacingSummary: 2-3 sentence description written for investors
- internalSummary: brief internal deal notes
- suggestedStatus: DRAFT, NEEDS_INFO, READY_TO_MATCH
- suggestedNextAction: what to do next`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1500,
      });

      const text = response.choices[0].message.content || '{}';
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch (err) {
      console.error('AI parser error:', err);
      return {
        missingFields: ['Unable to parse — please enter manually'],
        suggestedStatus: 'DRAFT',
        suggestedNextAction: 'Complete missing info',
      };
    }
  }

  async generateFollowUpMessage(deal: any): Promise<string> {
    const missing = deal.missingInfo || [];
    const source = deal.sourceName || 'Hi';

    const prompt = `You are a wholesale real estate disposition specialist. Write a brief, professional follow-up message to a deal source asking for missing information.

Deal: ${deal.address || deal.city || 'Unknown address'}, ${deal.state || ''}
Source name: ${source}
Missing info needed: ${missing.join(', ')}

Write a SHORT, friendly, professional text message (not email). Under 100 words. Sound like a real person, not a robot. Don't list everything as bullet points — write naturally.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
      });
      return response.choices[0].message.content || '';
    } catch {
      return `Hey ${source}! Can you send over ${missing.slice(0, 3).join(', ')} for the ${deal.city || 'property'} deal? Want to run it by some buyers today.`;
    }
  }

  async generateDealMathSummary(deal: any): Promise<string> {
    const spread = deal.spread || 0;
    const arv = deal.arv || 0;
    const asking = deal.askingPrice || deal.buyerFacingPrice || 0;
    const repairs = deal.repairEstimate || 0;
    const seventyRule = deal.seventyPercentRuleMax || 0;

    const prompt = `Write a 2-3 sentence deal math summary for a wholesale real estate investor. Be direct and honest.

Deal: ${deal.address || deal.city}, ${deal.state}
ARV: $${arv.toLocaleString()}
Asking: $${asking.toLocaleString()}
Repairs: $${repairs.toLocaleString()}
Spread: $${spread.toLocaleString()}
70% Rule Max: $${seventyRule.toLocaleString()}
Property type: ${deal.propertyType || 'SFR'}
Condition: ${deal.overallCondition || 'Unknown'}

Keep it under 60 words. Include whether asking is above/below 70% rule and what that means for buyers.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 120,
      });
      return response.choices[0].message.content || '';
    } catch {
      return `This deal shows an estimated $${spread.toLocaleString()} spread before holding costs. ${asking > seventyRule ? `Asking is $${(asking - seventyRule).toLocaleString()} above the 70% rule max, which may require negotiation with buyers.` : `Asking is within the 70% rule, making this attractive to most investors.`}`;
    }
  }
}
