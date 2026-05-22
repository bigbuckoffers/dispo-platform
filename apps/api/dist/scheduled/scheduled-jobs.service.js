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
var ScheduledJobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledJobsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../shared/prisma/prisma.service");
const buyers_service_1 = require("../modules/buyers/buyers.service");
const ai_writer_service_1 = require("../modules/ai/ai-writer.service");
const embeddings_service_1 = require("../modules/ai/embeddings.service");
let ScheduledJobsService = ScheduledJobsService_1 = class ScheduledJobsService {
    constructor(prisma, buyersService, aiWriter, embeddingsService) {
        this.prisma = prisma;
        this.buyersService = buyersService;
        this.aiWriter = aiWriter;
        this.embeddingsService = embeddingsService;
        this.logger = new common_1.Logger(ScheduledJobsService_1.name);
    }
    async recalculateAllScores() {
        this.logger.log('Starting nightly score recalculation...');
        let processed = 0;
        let errors = 0;
        const buyers = await this.prisma.buyer.findMany({
            where: { isActive: true, isSuspended: false },
            select: { id: true, organizationId: true },
        });
        this.logger.log(`Recalculating scores for ${buyers.length} buyers`);
        for (const buyer of buyers) {
            try {
                const scores = await this.buyersService.computeBuyerScores(buyer.id);
                await this.prisma.buyer.update({ where: { id: buyer.id }, data: scores });
                await this.prisma.buyerScoreHistory.create({ data: { buyerId: buyer.id, ...scores } });
                processed++;
                const newTier = scores.compositeScore >= 75 ? 'TIER_1'
                    : scores.compositeScore >= 45 ? 'TIER_2'
                        : 'TIER_3';
                await this.prisma.buyer.update({
                    where: { id: buyer.id },
                    data: { tier: newTier },
                });
                if (processed % 100 === 0) {
                    await new Promise(r => setTimeout(r, 100));
                }
            }
            catch (err) {
                errors++;
                this.logger.warn(`Score recalc failed for buyer ${buyer.id}: ${err.message}`);
            }
        }
        this.logger.log(`Nightly recalc complete: ${processed} processed, ${errors} errors`);
    }
    async updateRealBuyBoxes() {
        this.logger.log('Starting real buy box update...');
        const buyersWithPurchases = await this.prisma.buyer.findMany({
            where: {
                isActive: true,
                purchases: { some: {} },
            },
            include: {
                purchases: {
                    orderBy: { closedAt: 'desc' },
                    take: 20,
                },
            },
        });
        for (const buyer of buyersWithPurchases) {
            if (buyer.purchases.length < 3)
                continue;
            try {
                const learned = await this.aiWriter.updateRealBuyBox(buyer.id, buyer.purchases);
                if (!learned)
                    continue;
                await this.prisma.realBuyBox.upsert({
                    where: { buyerId: buyer.id },
                    create: {
                        buyerId: buyer.id,
                        learnedPriceMin: learned.learnedPriceMin,
                        learnedPriceMax: learned.learnedPriceMax,
                        confidenceScore: learned.confidence ?? 0,
                        dataPointCount: buyer.purchases.length,
                    },
                    update: {
                        learnedPriceMin: learned.learnedPriceMin,
                        learnedPriceMax: learned.learnedPriceMax,
                        confidenceScore: learned.confidence ?? 0,
                        dataPointCount: buyer.purchases.length,
                        lastUpdated: new Date(),
                    },
                });
            }
            catch (err) {
                this.logger.warn(`Real buy box update failed for ${buyer.id}: ${err.message}`);
            }
        }
        this.logger.log('Real buy box update complete');
    }
    async refreshStaleEmbeddings() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const staleBuyers = await this.prisma.buyer.findMany({
            where: {
                isActive: true,
                updatedAt: { gte: oneDayAgo },
            },
            select: { id: true },
            take: 500,
        });
        this.logger.log(`Refreshing embeddings for ${staleBuyers.length} buyers`);
        for (const buyer of staleBuyers) {
            try {
                await this.embeddingsService.generateBuyerEmbedding(buyer.id);
                await new Promise(r => setTimeout(r, 50));
            }
            catch (err) {
                this.logger.warn(`Embedding refresh failed for ${buyer.id}: ${err.message}`);
            }
        }
    }
    async expireListings() {
        const result = await this.prisma.marketplaceListing.updateMany({
            where: { expiresAt: { lt: new Date() }, visibility: 'PUBLIC' },
            data: { visibility: 'PRIVATE' },
        });
        this.logger.log(`Expired ${result.count} marketplace listings`);
    }
};
exports.ScheduledJobsService = ScheduledJobsService;
__decorate([
    (0, schedule_1.Cron)('0 2 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "recalculateAllScores", null);
__decorate([
    (0, schedule_1.Cron)('0 3 * * 0'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "updateRealBuyBoxes", null);
__decorate([
    (0, schedule_1.Cron)('0 4 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "refreshStaleEmbeddings", null);
__decorate([
    (0, schedule_1.Cron)('0 1 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledJobsService.prototype, "expireListings", null);
exports.ScheduledJobsService = ScheduledJobsService = ScheduledJobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        buyers_service_1.BuyersService,
        ai_writer_service_1.AiWriterService,
        embeddings_service_1.EmbeddingsService])
], ScheduledJobsService);
//# sourceMappingURL=scheduled-jobs.service.js.map