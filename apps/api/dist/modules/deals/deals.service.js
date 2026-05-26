"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DealsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const matching_service_1 = require("../matching/matching.service");
const ai_writer_service_1 = require("../ai/ai-writer.service");
let DealsService = DealsService_1 = class DealsService {
    constructor(prisma, matchingService, aiWriter, eventEmitter) {
        this.prisma = prisma;
        this.matchingService = matchingService;
        this.aiWriter = aiWriter;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(DealsService_1.name);
    }
    async getDefaultOrgId() {
        const org = await this.prisma.organization.findFirst();
        return org?.id || '';
    }
    async findAll(orgId, query) {
        const { page = 1, limit = 20, status, search } = query;
        const skip = (page - 1) * limit;
        const where = {
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
            this.prisma.deal.findMany({
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
    async create(orgId, userId, dto) {
        const deal = await this.prisma.deal.create({
            data: { organizationId: orgId, acquisitionRepId: userId, ...dto },
        });
        this.runPostCreateJobs(deal.id, orgId).catch(err => this.logger.error(`Post-create jobs failed for deal ${deal.id}: ${err.message}`));
        return deal;
    }
    async runPostCreateJobs(dealId, orgId) {
        const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
        if (!deal)
            return;
        try {
            const analysis = await this.aiWriter.generatePropertyAnalysis(deal);
            await this.prisma.deal.update({
                where: { id: dealId },
                data: {
                    flipScore: analysis.flipScore,
                    landlordScore: analysis.landlordScore,
                    cashBuyerDemand: analysis.cashBuyerDemand,
                    riskScore: analysis.riskScore,
                    aiAnalysis: analysis,
                },
            });
        }
        catch (err) {
            this.logger.warn(`AI analysis failed for deal ${dealId}: ${err.message}`);
        }
        await this.matchingService.queueMatchingJob(dealId, orgId);
    }
    async findOne(orgId, id) {
        const deal = await this.prisma.deal.findFirst({
            where: { id, organizationId: orgId },
            include: {
                comps: true,
                documents: true,
                _count: { select: { offers: true, matchResults: true, views: true } },
            },
        });
        if (!deal)
            throw new common_1.NotFoundException('Deal not found');
        return deal;
    }
    async update(orgId, id, dto, userId) {
        await this.findOne(orgId, id);
        return this.prisma.deal.update({ where: { id }, data: dto });
    }
    async getMatches(orgId, dealId, limit) {
        await this.findOne(orgId, dealId);
        return this.matchingService.getMatchesForDeal(dealId, limit);
    }
    async triggerMatching(orgId, dealId) {
        await this.findOne(orgId, dealId);
        return this.matchingService.queueMatchingJob(dealId, orgId);
    }
    async releaseToDealTier(orgId, dealId, tier, userId) {
        const deal = await this.findOne(orgId, dealId);
        const updateData = { status: client_1.DealStatus.ACTIVE };
        if (tier === 1 && !deal.tier1ReleasedAt)
            updateData.tier1ReleasedAt = new Date();
        if (tier === 2 && !deal.tier2ReleasedAt)
            updateData.tier2ReleasedAt = new Date();
        if (tier === 3 && !deal.tier3ReleasedAt)
            updateData.tier3ReleasedAt = new Date();
        await this.prisma.deal.update({ where: { id: dealId }, data: updateData });
        this.eventEmitter.emit('deal.released', { dealId, orgId, tier, userId });
        return { success: true, tier, releasedAt: new Date() };
    }
    async generateAiCampaign(orgId, dealId, tier) {
        const deal = await this.findOne(orgId, dealId);
        const content = await this.aiWriter.generateCampaignSequence(deal, tier);
        return content;
    }
    async updateStatus(orgId, id, status, userId) {
        await this.findOne(orgId, id);
        return this.prisma.deal.update({ where: { id }, data: { status } });
    }
    async remove(orgId, id) {
        await this.findOne(orgId, id);
        await this.prisma.deal.update({ where: { id }, data: { status: client_1.DealStatus.DEAD } });
    }
    async runArvAnalysis(id) {
        const deal = await this.prisma.deal.findUnique({ where: { id } });
        if (!deal)
            throw new Error('Deal not found');
        const addr = [deal.address, deal.city, deal.state, deal.zipCode].filter(Boolean).join(', ');
        const prop = `${deal.beds || '?'}bd/${deal.baths || '?'}ba, ${deal.sqft || '?'} sqft, built ${deal.yearBuilt || '?'}, ${deal.propertyType || 'SFR'}`;
        const prompt = `You are a Master Appraiser. Estimate ARV for: ${addr}. Property: ${prop}. Find 3-6 closed comps same subdivision last 12 months. Be conservative. Return ONLY valid JSON no other text: {"arvLow":0,"arvMedian":0,"arvHigh":0,"confidence":3,"confidenceReason":"...","comps":[{"address":"...","saleDate":"...","salePrice":0,"sqft":0,"pricePerSqft":0,"notes":"..."}],"recommendation":"...","dataWarnings":"..."}`;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 2000,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        const data = await response.json();
        console.log('ARV API response stop_reason:', data.stop_reason, 'content blocks:', data.content?.length);
        const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
        console.log('ARV text response:', text.substring(0, 300));
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const result = JSON.parse(jsonMatch[0]);
                if (result.arvMedian) {
                    await this.prisma.deal.update({ where: { id }, data: { arv: result.arvMedian } });
                }
                return result;
            }
            catch (e) {
                return { error: 'JSON parse failed', raw: text.substring(0, 500) };
            }
        }
        return { error: 'Could not parse ARV response', raw: text.substring(0, 500) };
    }
    async fetchZestimate(id) {
        const deal = await this.prisma.deal.findUnique({ where: { id } });
        if (!deal)
            throw new Error('Deal not found');
        if (!deal.address || !deal.city || !deal.state)
            throw new Error('Deal missing address');
        const addressSlug = [deal.address, deal.city, deal.state, deal.zipCode]
            .filter(Boolean).join(' ').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode || ''}`)}`;
        const searchUrl = `https://www.zillow.com/search/GetSearchPageState.htm?searchQueryState={"pagination":{},"isMapVisible":false,"filterState":{"sort":{"value":"globalrelevanceex"}},"mapBounds":{}}&wants={"cat1":["listResults","mapResults"]}&requestId=1&address=${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state}`)}`;
        const scraperKey = process.env.SCRAPER_API_KEY || '2937e26b28b93482446a9d030142aa50';
        try {
            const targetUrl = `https://www.zillow.com/homes/${encodeURIComponent(`${deal.address},-${deal.city},-${deal.state}_rb/`)}`;
            const scraperUrl = `http://api.scraperapi.com?api_key=${scraperKey}&url=${encodeURIComponent(zillowUrl)}&render=true`;
            const response = await fetch(scraperUrl, { signal: AbortSignal.timeout(30000) });
            const html = await response.text();
            console.log('Zillow scrape status:', response.status, 'html length:', html.length);
            console.log('Zillow html snippet:', html.substring(0, 500));
            const zestimateRaw = html.match(/zestimate/gi);
            console.log('Zestimate mentions in HTML:', zestimateRaw?.length || 0);
            let zestimate = null;
            let zillowLink = zillowUrl;
            const patterns = [
                /"zestimate":(\d+)/,
                /"zestimate":\s*(\d+)/,
                /Zestimate<\/div><div[^>]*>\$([0-9,]+)/,
                /zestimate[^>]*>\$([0-9,]+)/i,
                /"price":(\d+).*?"zestimate"/,
            ];
            const zIdx = html.indexOf('zestimate');
            if (zIdx > 0) {
                console.log('Zestimate context 1:', JSON.stringify(html.substring(zIdx - 20, zIdx + 150)));
            }
            const zIdx2 = html.indexOf('Zestimate');
            if (zIdx2 > 0) {
                console.log('Zestimate context 2:', JSON.stringify(html.substring(zIdx2 - 20, zIdx2 + 150)));
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
            const jsonMatch = html.match(/<!--({"queryState".*?)-->/s) ||
                html.match(/window\.__PRELOADED_STATE__\s*=\s*({.*?});/s) ||
                html.match(/"hdpData":\s*({.*?"zestimate".*?})/s);
            if (!zestimate && jsonMatch) {
                try {
                    const data = JSON.parse(jsonMatch[1]);
                    const z = data?.hdpData?.homeInfo?.zestimate ||
                        data?.props?.pageProps?.gdpClientCache?.['Gdp:*']?.property?.zestimate ||
                        data?.zestimate;
                    if (z && z > 10000)
                        zestimate = z;
                }
                catch { }
            }
            if (zestimate) {
                await this.prisma.deal.update({
                    where: { id },
                    data: { zillowEstimate: zestimate, zillowUrl: zillowLink }
                });
                return { success: true, zestimate, zillowUrl: zillowLink, source: 'scraperapi' };
            }
            await this.prisma.deal.update({ where: { id }, data: { zillowUrl: zillowLink } });
            return { success: false, message: 'Zestimate not found on page — Zillow URL saved. Try adding manually.', zillowUrl: zillowLink };
        }
        catch (err) {
            return { success: false, message: err.message || 'Scrape failed', zillowUrl };
        }
    }
};
exports.DealsService = DealsService;
exports.DealsService = DealsService = DealsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        matching_service_1.MatchingService,
        ai_writer_service_1.AiWriterService,
        event_emitter_1.EventEmitter2])
], DealsService);
//# sourceMappingURL=deals.service.js.map