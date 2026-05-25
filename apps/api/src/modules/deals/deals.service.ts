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
}

  async runArvAnalysis(id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new Error('Deal not found');

    const prompt = `You are a Master Appraiser. Estimate the ARV for: ${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}. Property: ${deal.beds||'?'}bd/${deal.baths||'?'}ba, ${deal.sqft||'?'} sqft, built ${deal.yearBuilt||'?'}, ${deal.propertyType||'SFR'}. Search for 3-6 closed comps in the same subdivision within 12 months. Be conservative. Return ONLY valid JSON with no other text: {"arvLow":0,"arvMedian":0,"arvHigh":0,"confidence":3,"confidenceReason":"...","comps":[{"address":"...","saleDate":"...","salePrice":0,"sqft":0,"pricePerSqft":0,"notes":"..."}],"recommendation":"...","dataWarnings":"..."}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json() as any;
    const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const result = JSON.parse(m[0]);
      if (result.arvMedian) {
        await this.prisma.deal.update({ where: { id }, data: { arv: result.arvMedian } });
      }
      return result;
    }
    return { error: 'Could not parse ARV response', raw: text };
  }
