import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DealStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { AiWriterService } from '../ai/ai-writer.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { RentCastService } from '../rentcast/rentcast.service';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private prisma: PrismaService,
    private matchingService: MatchingService,
    private aiWriter: AiWriterService,
    private eventEmitter: EventEmitter2,
    private rentcast: RentCastService,
  ) {}

  async getDefaultOrgId(): Promise<string> {
    const org = await this.prisma.organization.findFirst();
    return org?.id || '';
  }

  async findAll(orgId: string, query: any) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: orgId || await this.prisma.organization.findFirst().then(o => o?.id || ''),
      ...(status && { status }),
      ...(search && {
        OR: [
          { address: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { zipCode: { contains: search } },
        ],
      }),
    };

    const [deals, total] = await Promise.all([
      (this.prisma.deal as any).findMany({
        where,
        skip,
        take: +limit,
        orderBy: [
          { dealPriorityScore: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          _count: { select: { offers: true, matchResults: true, views: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return { data: deals, meta: { total, page: +page, limit: +limit } };
  }

  async create(orgId: string, userId: string, dto: CreateDealDto) {
    const deal = await this.prisma.deal.create({
      data: { organizationId: orgId, acquisitionRepId: userId, ...dto },
    });

    // Fire-and-forget: AI analysis + matching
    this.runPostCreateJobs(deal.id, orgId).catch(err =>
      this.logger.error(`Post-create jobs failed for deal ${deal.id}: ${err.message}`)
    );

    return deal;
  }

  private async runPostCreateJobs(dealId: string, orgId: string) {
    // 1. AI property analysis
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) return;

    try {
      const analysis = await this.aiWriter.generatePropertyAnalysis(deal);
      await this.prisma.deal.update({
        where: { id: dealId },
        data: {
          flipScore: analysis.flipScore,
          landlordScore: analysis.landlordScore,
          cashBuyerDemand: analysis.cashBuyerDemand,
          riskScore: analysis.riskScore,
          aiAnalysis: analysis as any,
        },
      });
    } catch (err) {
      this.logger.warn(`AI analysis failed for deal ${dealId}: ${err.message}`);
    }

    // 2. Fetch public value estimate via RentCast
    try {
      const avm = await this.rentcast.getValueEstimate(
        deal.address, deal.city || '', deal.state || '', deal.zipCode || '',
        deal.beds || undefined, deal.baths || undefined, deal.sqft || undefined, deal.propertyType || undefined
      );
      if (avm?.price) {
        await this.prisma.deal.update({
          where: { id: dealId },
          data: { rentcastEstimate: avm.price, rentcastRangeLow: avm.priceRangeLow, rentcastRangeHigh: avm.priceRangeHigh },
        });
        this.logger.log(`RentCast AVM for deal ${dealId}: $${avm.price}`);
      }
    } catch (err) {
      this.logger.warn(`RentCast failed for deal ${dealId}: ${err.message}`);
    }
    // 3. Queue matching
    await this.matchingService.queueMatchingJob(dealId, orgId);
  }

  async findOne(orgId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId: orgId },
      include: {
        comps: true,
        documents: true,
        _count: { select: { offers: true, matchResults: true, views: true } },
      },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async update(orgId: string, id: string, dto: any, userId: string) {
    await this.findOne(orgId, id);
    return this.prisma.deal.update({ where: { id }, data: dto });
  }

  async getMatches(orgId: string, dealId: string, limit: number) {
    await this.findOne(orgId, dealId);
    return this.matchingService.getMatchesForDeal(dealId, limit);
  }

  async triggerMatching(orgId: string, dealId: string) {
    await this.findOne(orgId, dealId);
    return this.matchingService.queueMatchingJob(dealId, orgId);
  }

  async releaseToDealTier(orgId: string, dealId: string, tier: 1 | 2 | 3, userId: string) {
    const deal = await this.findOne(orgId, dealId);

    const updateData: any = { status: DealStatus.ACTIVE };
    if (tier === 1 && !deal.tier1ReleasedAt) updateData.tier1ReleasedAt = new Date();
    if (tier === 2 && !deal.tier2ReleasedAt) updateData.tier2ReleasedAt = new Date();
    if (tier === 3 && !deal.tier3ReleasedAt) updateData.tier3ReleasedAt = new Date();

    await this.prisma.deal.update({ where: { id: dealId }, data: updateData });

    // Emit so dispo module sends campaigns
    this.eventEmitter.emit('deal.released', { dealId, orgId, tier, userId });

    return { success: true, tier, releasedAt: new Date() };
  }

  async generateAiCampaign(orgId: string, dealId: string, tier: string) {
    const deal = await this.findOne(orgId, dealId);
    const content = await this.aiWriter.generateCampaignSequence(deal, tier);
    return content;
  }

  async updateStatus(orgId: string, id: string, status: DealStatus, userId: string) {
    await this.findOne(orgId, id);
    return this.prisma.deal.update({ where: { id }, data: { status } });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.deal.update({ where: { id }, data: { status: DealStatus.DEAD } });
  }

  async runArvAnalysis(id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new Error('Deal not found');
    const addr = [deal.address, deal.city, deal.state, deal.zipCode].filter(Boolean).join(', ');
    const prop = `${deal.beds||'?'}bd/${deal.baths||'?'}ba, ${deal.sqft||'?'} sqft, built ${deal.yearBuilt||'?'}, ${deal.propertyType||'SFR'}, lot: ${(deal as any).lotSize||'unknown'}`;

    const systemPrompt = `You are a certified Master Appraiser and underwriting grade valuation analyst. Your job is to estimate the After Repair Value (ARV) for the subject property using only current public data from the last 12 months and the same subdivision. You must be conservative.

Hard rules:
1. Data sources allowed: Zillow, Realtor.com, Trulia, Redfin, Opendoor, county appraisal district, county deed records, MLS public pages if accessible.
2. Recency: Do not use any sale older than 12 months from today.
3. Location match: Stay in the same subdivision. If you cannot prove same subdivision, do not use the comp.
4. Property type match: Same property type as the subject.
5. Condition: ARV assumes renovated condition. Use comps that appear renovated or market ready.
6. Conservative bias: When in doubt, choose the lower supported value.

Comp selection: Pull 3-6 closed sales in same subdivision within last 12 months matching property type, closest living area match first.

You MUST return ONLY valid JSON, no other text, no markdown, no explanation outside the JSON:
{
  "arvLow": 0,
  "arvMedian": 0,
  "arvHigh": 0,
  "confidence": 3,
  "confidenceReason": "...",
  "subdivisionName": "...",
  "comps": [
    {
      "address": "...",
      "saleDate": "...",
      "salePrice": 0,
      "sqft": 0,
      "beds": 0,
      "baths": 0,
      "pricePerSqft": 0,
      "renovationEvidence": "...",
      "source": "...",
      "adjustedValue": 0,
      "adjustmentNotes": "..."
    }
  ],
  "psfAnalysis": "...",
  "recommendation": "...",
  "dataWarnings": "...",
  "assumptionLog": "...",
  "qualityChecks": {
    "recencyCheck": "pass/fail",
    "subdivisionCheck": "pass/fail",
    "typeCheck": "pass/fail",
    "outlierCheck": "..."
  }
}`;

    const userPrompt = `Subject property: ${addr}
Property details: ${prop}
Valuation goal: Estimate ARV if fully renovated, market ready, and financed buyer eligible.
Today's date: ${new Date().toISOString().split('T')[0]}

Find comps now and return the JSON.`;

    const OpenAI = require('openai').default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
    });

    const raw = response.choices[0].message.content || '{}';
    console.log('ARV response preview:', raw.substring(0, 200));

    try {
      const result = JSON.parse(raw);
      if (result.arvMedian && result.arvMedian > 0) {
        await this.prisma.deal.update({ where: { id }, data: { arv: result.arvMedian } });
      }
      return result;
    } catch(e) {
      return { error: 'Could not parse ARV response', raw: raw.substring(0, 500) };
    }
  }

  async fetchZestimate(id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new Error('Deal not found');
    if (!deal.address || !deal.city || !deal.state) throw new Error('Deal missing address');

    const fullAddr = `${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode || ''}`.trim();
    const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(fullAddr)}`;

    const searchPrompt = `Use your web_search tool right now to search for: Zillow Zestimate "${deal.address}" ${deal.city} ${deal.state} ${deal.zipCode || ''}. Find the current Zillow Zestimate value for this specific property.`;

    let researchText = '';
    try {
      const r1 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
          messages: [{ role: 'user', content: searchPrompt }],
        }),
      });
      const d1 = await r1.json();
      researchText = (d1.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join(' ');
      console.log('Zestimate research:', researchText.substring(0, 300));
    } catch(e: any) { console.log('Zestimate search error:', e.message); }

    let zestimate: number | null = null;
    if (researchText && researchText.length > 20) {
      try {
        const r2 = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 100,
            system: 'You are a JSON-only API. Output ONLY valid JSON. No prose.',
            messages: [{ role: 'user', content: `Extract the Zillow Zestimate dollar amount from this text. Return ONLY: {"zestimate": 450000} or {"zestimate": null} if not found.\n\nText: ${researchText.substring(0, 1000)}` }],
          }),
        });
        const d2 = await r2.json();
        const raw = (d2.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
        console.log('Zestimate extract:', raw);
        const clean = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean.substring(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
        if (parsed.zestimate && parsed.zestimate > 10000) zestimate = parsed.zestimate;
      } catch(e: any) { console.log('Zestimate extract error:', e.message); }
    }

    if (zestimate) {
      await this.prisma.deal.update({ where: { id }, data: { zillowEstimate: zestimate, zillowUrl } });
      return { success: true, zestimate, zillowUrl, source: 'ai_web_search' };
    }
    await this.prisma.deal.update({ where: { id }, data: { zillowUrl } });
    return { success: false, message: 'Zestimate not found — Zillow URL saved.', zillowUrl };
  }
  async fetchAllMissingAvm(orgId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { organizationId: orgId, rentcastEstimate: null },
      select: { id: true, address: true, city: true, state: true, zipCode: true, beds: true, baths: true, sqft: true, propertyType: true },
    });
    const usage = this.rentcast.getUsage();
    const toFetch = deals.slice(0, usage.remaining);
    let fetched = 0;
    for (const deal of toFetch) {
      try {
        const avm = await this.rentcast.getValueEstimate(
          deal.address, deal.city || '', deal.state || '', deal.zipCode || '',
          deal.beds || undefined, deal.baths || undefined, deal.sqft || undefined, deal.propertyType || undefined
        );
        if (avm?.price) {
          await this.prisma.deal.update({
            where: { id: deal.id },
            data: { rentcastEstimate: avm.price, rentcastRangeLow: avm.priceRangeLow, rentcastRangeHigh: avm.priceRangeHigh },
          });
          fetched++;
        }
      } catch(e) { this.logger.warn(`RentCast batch failed for ${deal.id}`); }
    }
    return { fetched, skipped: deals.length - toFetch.length, remaining: usage.remaining - fetched };
  }
}