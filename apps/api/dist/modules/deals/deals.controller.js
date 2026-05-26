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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const decorators_1 = require("../../shared/decorators");
const arv_engine_service_1 = require("./arv-engine.service");
const deals_service_1 = require("./deals.service");
const deals_scoring_service_1 = require("./deals-scoring.service");
const deals_ai_analyze_service_1 = require("./deals-ai-analyze.service");
const deals_ai_parser_service_1 = require("./deals-ai-parser.service");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
let DealsController = class DealsController {
    constructor(dealsService, scoringService, aiParser, aiAnalyze, prisma, arvEngine) {
        this.dealsService = dealsService;
        this.scoringService = scoringService;
        this.aiParser = aiParser;
        this.aiAnalyze = aiAnalyze;
        this.prisma = prisma;
        this.arvEngine = arvEngine;
    }
    async findAll(orgId, query) {
        return this.dealsService.findAll(orgId || await this.dealsService.getDefaultOrgId(), query);
    }
    async getMarketIntelligence() {
        const deals = await this.prisma.deal.findMany({
            where: { status: { notIn: ['DEAD', 'CLOSED'] } },
        });
        const marketMap = new Map();
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
            if (d.marketBuyerNeedRecommendation)
                m.recommendation = d.marketBuyerNeedRecommendation;
        }
        const markets = Array.from(marketMap.values()).map(m => ({
            ...m,
            averageDealScore: m.dealScores.length > 0
                ? Math.round(m.dealScores.reduce((a, b) => a + b, 0) / m.dealScores.length) : 0,
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
    async importRaw(body) {
        const parsed = await this.aiParser.parseDealText(body.rawText, body.sourceType);
        return { ...parsed, rawInputText: body.rawText, facebookPostUrl: body.facebookUrl, sourceType: body.sourceType || 'MANUAL' };
    }
    async create(orgId, userId, dto) {
        const metrics = this.scoringService.calculateMetrics(dto);
        const marketKey = `${dto.city || ''}, ${dto.state || ''}`.trim().replace(/^,\s*/, '');
        return this.prisma.deal.create({
            data: {
                ...dto,
                ...metrics,
                marketKey,
                id: undefined,
                organizationId: orgId || await this.dealsService.getDefaultOrgId(),
                address: dto.address || 'TBD',
                city: dto.city || '',
                state: dto.state || '',
                zipCode: dto.zipCode || '',
                askingPrice: dto.askingPrice || 0,
            },
        });
    }
    async findOne(orgId, id) {
        return this.dealsService.findOne(orgId || await this.dealsService.getDefaultOrgId(), id);
    }
    async update(id, dto) {
        return this.prisma.deal.update({ where: { id }, data: dto });
    }
    async remove(id) {
        return this.prisma.deal.delete({ where: { id } });
    }
    async analyzeDeal(id) {
        return this.aiAnalyze.analyzeDeal(id);
    }
    async parseDeal(id) {
        const deal = await this.prisma.deal.findUnique({ where: { id } });
        if (!deal?.rawInputText)
            return { error: 'No raw text to parse' };
        const parsed = await this.aiParser.parseDealText(deal.rawInputText, deal.sourceType || 'MANUAL');
        const metrics = this.scoringService.calculateMetrics({ ...deal, ...parsed });
        return this.prisma.deal.update({ where: { id }, data: { ...parsed, ...metrics } });
    }
    async calculateMetrics(id) {
        const deal = await this.prisma.deal.findUnique({ where: { id } });
        if (!deal)
            return { error: 'Not found' };
        const metrics = this.scoringService.calculateMetrics(deal);
        const mathSummary = await this.aiParser.generateDealMathSummary({ ...deal, ...metrics });
        return this.prisma.deal.update({ where: { id }, data: { ...metrics, aiDealMathSummary: mathSummary } });
    }
    async generateFollowUp(id) {
        const deal = await this.prisma.deal.findUnique({ where: { id } });
        if (!deal)
            return { error: 'Not found' };
        const metrics = this.scoringService.calculateMetrics(deal);
        const message = await this.aiParser.generateFollowUpMessage({ ...deal, missingInfo: metrics.missingInfo });
        await this.prisma.deal.update({ where: { id }, data: { missingInfo: metrics.missingInfo, missingInfoCount: metrics.missingInfoCount } });
        return { message, missingInfo: metrics.missingInfo };
    }
    async matchBuyers(id) {
        const deal = await this.prisma.deal.findUnique({ where: { id } });
        if (!deal)
            return { error: 'Not found' };
        const buyers = await this.prisma.buyer.findMany({ where: { isActive: true }, include: { buyBox: true } });
        let matched = 0, tier1 = 0;
        for (const buyer of buyers) {
            if (!buyer.buyBox)
                continue;
            const bb = buyer.buyBox;
            const stateMatch = !bb.states?.length || bb.states.includes(deal.state);
            const price = deal.askingPrice || deal.buyerFacingPrice || 0;
            const priceMatch = (!bb.minPrice || price >= bb.minPrice) && (!bb.maxPrice || price <= bb.maxPrice);
            if (stateMatch && priceMatch) {
                matched++;
                if (buyer.tier === 'TIER_1')
                    tier1++;
            }
        }
        const buyerDemandScore = Math.min(100, matched * 5);
        return this.prisma.deal.update({
            where: { id },
            data: {
                matchedBuyerCount: matched, tier1MatchCount: tier1, buyerDemandScore,
                status: (matched > 0 ? 'MATCHED' : deal.status),
            },
        });
    }
    async arvAnalysis(id, body) {
        return this.arvEngine.runArvEngine(id, body?.manualApprovals);
    }
    async fetchZestimate(id) {
        return this.dealsService.fetchZestimate(id);
    }
};
exports.DealsController = DealsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('market-intelligence'),
    (0, swagger_1.ApiOperation)({ summary: 'Get market demand intelligence' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "getMarketIntelligence", null);
__decorate([
    (0, common_1.Post)('import/raw'),
    (0, swagger_1.ApiOperation)({ summary: 'Parse raw deal text with AI' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "importRaw", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create deal' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, decorators_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update deal' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete deal' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/analyze'),
    (0, swagger_1.ApiOperation)({ summary: 'AI analyze deal' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "analyzeDeal", null);
__decorate([
    (0, common_1.Post)(':id/parse'),
    (0, swagger_1.ApiOperation)({ summary: 'Re-parse deal from raw text' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "parseDeal", null);
__decorate([
    (0, common_1.Post)(':id/calculate-metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'Recalculate deal scores' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "calculateMetrics", null);
__decorate([
    (0, common_1.Post)(':id/generate-follow-up'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate follow-up message' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "generateFollowUp", null);
__decorate([
    (0, common_1.Post)(':id/match-buyers'),
    (0, swagger_1.ApiOperation)({ summary: 'Run buyer matching' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "matchBuyers", null);
__decorate([
    (0, common_1.Post)(':id/arv-analysis'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "arvAnalysis", null);
__decorate([
    (0, common_1.Post)(':id/fetch-zestimate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "fetchZestimate", null);
exports.DealsController = DealsController = __decorate([
    (0, swagger_1.ApiTags)('deals'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('deals'),
    __metadata("design:paramtypes", [deals_service_1.DealsService,
        deals_scoring_service_1.DealsScoringService,
        deals_ai_parser_service_1.DealsAiParserService,
        deals_ai_analyze_service_1.DealsAiAnalyzeService,
        prisma_service_1.PrismaService,
        arv_engine_service_1.ArvEngineService])
], DealsController);
//# sourceMappingURL=deals.controller.js.map