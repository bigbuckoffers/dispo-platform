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
    async findAll(orgId, query) {
        const { page = 1, limit = 20, status, search } = query;
        const skip = (page - 1) * limit;
        const where = {
            organizationId: orgId,
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
                orderBy: { createdAt: 'desc' },
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