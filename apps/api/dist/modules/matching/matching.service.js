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
var MatchingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const embeddings_service_1 = require("../ai/embeddings.service");
let MatchingService = MatchingService_1 = class MatchingService {
    constructor(prisma, embeddingsService, matchingQueue) {
        this.prisma = prisma;
        this.embeddingsService = embeddingsService;
        this.matchingQueue = matchingQueue;
        this.logger = new common_1.Logger(MatchingService_1.name);
        this.WEIGHTS = {
            vector: 0.35,
            geo: 0.20,
            price: 0.15,
            reliability: 0.15,
            activity: 0.10,
            historical: 0.05,
        };
        this.MIN_SCORE_THRESHOLD = 0.35;
        this.TOP_N_RESULTS = 50;
    }
    async queueMatchingJob(dealId, orgId) {
        const job = await this.matchingQueue.add('match-deal', { dealId, orgId }, { priority: 1, delay: 0 });
        await this.prisma.matchJob.upsert({
            where: { id: dealId },
            create: { id: dealId, dealId, status: 'QUEUED' },
            update: { status: 'QUEUED', startedAt: null, completedAt: null },
        }).catch(() => {
            this.prisma.matchJob.create({ data: { dealId, status: 'QUEUED' } });
        });
        return { jobId: String(job.id), eta: 8 };
    }
    async runMatchingForDeal(dealId, orgId) {
        this.logger.log(`Running matching for deal ${dealId}`);
        const [deal, dealEmbedding] = await Promise.all([
            this.prisma.deal.findUnique({
                where: { id: dealId },
                include: { comps: true },
            }),
            this.prisma.dealEmbedding.findUnique({ where: { dealId } }),
        ]);
        if (!deal)
            throw new Error(`Deal ${dealId} not found`);
        let dealVector = dealEmbedding?.vector;
        if (!dealVector) {
            const text = this.buildDealTextForEmbedding(deal);
            dealVector = await this.embeddingsService.generateEmbedding(text);
            await this.embeddingsService.storeDealEmbedding(dealId, dealVector);
        }
        const buyers = await this.prisma.buyer.findMany({
            where: {
                organizationId: orgId,
                isActive: true,
                isSuspended: false,
            },
            include: {
                buyBox: true,
                realBuyBox: true,
                embedding: true,
                _count: {
                    select: { purchases: true, offers: true },
                },
            },
        });
        this.logger.log(`Scoring ${buyers.length} buyers for deal ${dealId}`);
        const scores = [];
        for (const buyer of buyers) {
            try {
                const score = await this.scoreBuyerForDeal(buyer, deal, dealVector);
                if (score.finalScore >= this.MIN_SCORE_THRESHOLD) {
                    scores.push(score);
                }
            }
            catch (err) {
                this.logger.warn(`Scoring failed for buyer ${buyer.id}: ${err.message}`);
            }
        }
        scores.sort((a, b) => b.finalScore - a.finalScore);
        const topScores = scores.slice(0, this.TOP_N_RESULTS).map((s, i) => ({
            ...s,
            rank: i + 1,
        }));
        await this.persistMatchResults(dealId, topScores);
        return topScores;
    }
    async scoreBuyerForDeal(buyer, deal, dealVector) {
        let vectorScore = 0;
        if (buyer.embedding?.vector) {
            vectorScore = this.cosineSimilarity(Array.from(buyer.embedding.vector), dealVector);
            vectorScore = Math.max(0, vectorScore);
        }
        const geoScore = this.computeGeoScore(buyer.buyBox, deal);
        const priceScore = this.computePriceScore(buyer.buyBox, deal);
        const reliabilityScore = (buyer.reliabilityScore ?? 50) / 100;
        const activityScore = (buyer.activityScore ?? 50) / 100;
        const historicalScore = await this.computeHistoricalScore(buyer.id, deal);
        const finalScore = vectorScore * this.WEIGHTS.vector +
            geoScore * this.WEIGHTS.geo +
            priceScore * this.WEIGHTS.price +
            reliabilityScore * this.WEIGHTS.reliability +
            activityScore * this.WEIGHTS.activity +
            historicalScore * this.WEIGHTS.historical;
        const confidencePct = Math.round(finalScore * 100);
        const { min: estimatedOfferMin, max: estimatedOfferMax } = this.estimateOfferRange(buyer, deal);
        return {
            buyerId: buyer.id,
            finalScore,
            vectorScore,
            geoScore,
            priceScore,
            reliabilityScore,
            activityScore,
            historicalScore,
            rank: 0,
            confidencePct,
            estimatedOfferMin,
            estimatedOfferMax,
        };
    }
    computeGeoScore(buyBox, deal) {
        if (!buyBox)
            return 0;
        let score = 0;
        if (buyBox.states?.includes(deal.state))
            score += 0.4;
        else if (buyBox.states?.length === 0)
            score += 0.2;
        if (buyBox.zipCodes?.includes(deal.zipCode))
            score += 0.4;
        else if (buyBox.counties?.includes(deal.county))
            score += 0.2;
        if (buyBox.counties?.length === 0 && buyBox.zipCodes?.length === 0)
            score += 0.2;
        return Math.min(1, score);
    }
    computePriceScore(buyBox, deal) {
        if (!buyBox)
            return 0.5;
        const price = deal.askingPrice;
        const min = buyBox.minPrice ?? 0;
        const max = buyBox.maxPrice ?? Infinity;
        if (price >= min && price <= max)
            return 1;
        if (price < min) {
            const diff = (min - price) / min;
            return Math.max(0, 1 - diff * 2);
        }
        if (price > max) {
            const diff = (price - max) / max;
            return Math.max(0, 1 - diff * 2);
        }
        return 0;
    }
    async computeHistoricalScore(buyerId, deal) {
        const recentPurchases = await this.prisma.purchaseHistory.findMany({
            where: {
                buyerId,
                closedAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
            },
            take: 10,
        });
        if (recentPurchases.length === 0)
            return 0.3;
        const avgPrice = recentPurchases.reduce((s, p) => s + p.purchasePrice, 0) / recentPurchases.length;
        const priceSimilarity = 1 - Math.min(1, Math.abs(deal.askingPrice - avgPrice) / Math.max(avgPrice, 1));
        return Math.min(1, priceSimilarity * 0.5 + (Math.min(recentPurchases.length, 5) / 5) * 0.5);
    }
    estimateOfferRange(buyer, deal) {
        const askingPrice = deal.askingPrice;
        return {
            min: Math.round(askingPrice * 0.85),
            max: Math.round(askingPrice * 0.97),
        };
    }
    async persistMatchResults(dealId, scores) {
        await this.prisma.$transaction(scores.map(s => this.prisma.matchResult.upsert({
            where: { dealId_buyerId: { dealId, buyerId: s.buyerId } },
            create: {
                dealId,
                buyerId: s.buyerId,
                finalScore: s.finalScore,
                vectorScore: s.vectorScore,
                geoScore: s.geoScore,
                priceScore: s.priceScore,
                reliabilityScore: s.reliabilityScore,
                activityScore: s.activityScore,
                historicalScore: s.historicalScore,
                rank: s.rank,
                confidencePct: s.confidencePct,
                estimatedOfferMin: s.estimatedOfferMin,
                estimatedOfferMax: s.estimatedOfferMax,
            },
            update: {
                finalScore: s.finalScore,
                rank: s.rank,
                confidencePct: s.confidencePct,
            },
        })));
    }
    async getMatchesForDeal(dealId, limit = 25) {
        return this.prisma.matchResult.findMany({
            where: { dealId },
            orderBy: { rank: 'asc' },
            take: limit,
            include: {
                buyer: {
                    select: {
                        id: true, firstName: true, lastName: true, email: true, phone: true,
                        company: true, tier: true, investorType: true,
                        reliabilityScore: true, liquidityScore: true, activityScore: true,
                        buyBox: { select: { states: true, minPrice: true, maxPrice: true } },
                    },
                },
            },
        });
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length)
            return 0;
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom === 0 ? 0 : dot / denom;
    }
    buildDealTextForEmbedding(deal) {
        return [
            `${deal.propertyType} property in ${deal.city}, ${deal.state} ${deal.zipCode}`,
            `Asking price: $${deal.askingPrice}`,
            `ARV: $${deal.arv ?? 'unknown'}`,
            `Repair estimate: $${deal.repairEstimate ?? 'unknown'}`,
            `Beds: ${deal.beds ?? '?'}, Baths: ${deal.baths ?? '?'}, Sqft: ${deal.sqft ?? '?'}`,
            `Year built: ${deal.yearBuilt ?? 'unknown'}`,
            `Occupancy: ${deal.occupancy}`,
            deal.sellerNotes ? `Notes: ${deal.sellerNotes}` : '',
        ].filter(Boolean).join('. ');
    }
};
exports.MatchingService = MatchingService;
exports.MatchingService = MatchingService = MatchingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bull_1.InjectQueue)('matching')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        embeddings_service_1.EmbeddingsService, Object])
], MatchingService);
//# sourceMappingURL=matching.service.js.map