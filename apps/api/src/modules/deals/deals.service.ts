import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DealStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { AiWriterService } from '../ai/ai-writer.service';
import { CreateDealDto } from './dto/create-deal.dto';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private prisma: PrismaService,
    private matchingService: MatchingService,
    private aiWriter: AiWriterService,
    private eventEmitter: EventEmitter2,
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

    // 2. Queue matching
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

    // Build Zillow search URL
    const addressSlug = [deal.address, deal.city, deal.state, deal.zipCode]
      .filter(Boolean).join(' ').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode || ''}`)}`;
    const searchUrl = `https://www.zillow.com/search/GetSearchPageState.htm?searchQueryState={"pagination":{},"isMapVisible":false,"filterState":{"sort":{"value":"globalrelevanceex"}},"mapBounds":{}}&wants={"cat1":["listResults","mapResults"]}&requestId=1&address=${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state}`)}`;

    const scraperKey = process.env.SCRAPER_API_KEY || '2937e26b28b93482446a9d030142aa50';

    try {
      // Use ScraperAPI to fetch Zillow property page
      const targetUrl = `https://www.zillow.com/homes/${encodeURIComponent(`${deal.address},-${deal.city},-${deal.state}_rb/`)}`;
      const scraperUrl = `http://api.scraperapi.com?api_key=${scraperKey}&url=${encodeURIComponent(zillowUrl)}&render=true`;

      const response = await fetch(scraperUrl, { signal: AbortSignal.timeout(30000) });
      const html = await response.text();
      console.log('Zillow scrape status:', response.status, 'html length:', html.length);
      console.log('Zillow html snippet:', html.substring(0, 500));
      const zestimateRaw = html.match(/zestimate/gi);
      console.log('Zestimate mentions in HTML:', zestimateRaw?.length || 0);

      // Extract Zestimate from HTML
      let zestimate: number | null = null;
      let zillowLink = zillowUrl;

      // Try to find Zestimate in the page HTML
      const patterns = [
        /"zestimate":(\d+)/,
        /"zestimate":\s*(\d+)/,
        /Zestimate<\/div><div[^>]*>\$([0-9,]+)/,
        /zestimate[^>]*>\$([0-9,]+)/i,
        /"price":(\d+).*?"zestimate"/,
      ];

      // Log zestimate context for debugging
      const zIdx = html.indexOf('zestimate');
      if (zIdx > 0) {
        console.log('Zestimate context 1:', JSON.stringify(html.substring(zIdx-20, zIdx+150)));
      }
      const zIdx2 = html.indexOf('Zestimate');
      if (zIdx2 > 0) {
        console.log('Zestimate context 2:', JSON.stringify(html.substring(zIdx2-20, zIdx2+150)));
      }

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const val = parseInt(match[1].replace(/,/g, ''));
          if (val > 10000 && val < 50000000) {
            zestimate = val;
            break;
          }
        }
      }

      // Also try JSON data embedded in page
      const jsonMatch = html.match(/<!--({"queryState".*?)-->/s) ||
                        html.match(/window\.__PRELOADED_STATE__\s*=\s*({.*?});/s) ||
                        html.match(/"hdpData":\s*({.*?"zestimate".*?})/s);

      if (!zestimate && jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          const z = data?.hdpData?.homeInfo?.zestimate ||
                    data?.props?.pageProps?.gdpClientCache?.['Gdp:*']?.property?.zestimate ||
                    data?.zestimate;
          if (z && z > 10000) zestimate = z;
        } catch {}
      }

      if (zestimate) {
        await this.prisma.deal.update({
          where: { id },
          data: { zillowEstimate: zestimate, zillowUrl: zillowLink }
        });
        return { success: true, zestimate, zillowUrl: zillowLink, source: 'scraperapi' };
      }

      // If no Zestimate found, still save the URL
      await this.prisma.deal.update({ where: { id }, data: { zillowUrl: zillowLink } });
      return { success: false, message: 'Zestimate not found on page — Zillow URL saved. Try adding manually.', zillowUrl: zillowLink };

    } catch (err: any) {
      return { success: false, message: err.message || 'Scrape failed', zillowUrl };
    }
  }
}
