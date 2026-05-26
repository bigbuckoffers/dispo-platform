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
var DealSourcesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealSourcesService = exports.RELIABILITY_LABELS = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
exports.RELIABILITY_LABELS = {
    NEW_SOURCE: 'New Source',
    TRUSTED_SOURCE: 'Trusted Source',
    GOOD_SOURCE: 'Good Source',
    SLOW_RESPONSE: 'Slow Response',
    BAD_INFO_BEFORE: 'Bad Info Before',
    LOW_QUALITY: 'Low Quality',
    CLOSED_BEFORE: 'Closed Before',
    BLACKLIST: 'Blacklist',
};
let DealSourcesService = DealSourcesService_1 = class DealSourcesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DealSourcesService_1.name);
    }
    async getDefaultOrgId() {
        const org = await this.prisma.organization.findFirst();
        return org?.id || '';
    }
    async findOrCreate(orgId, data) {
        if (data.phone) {
            const byPhone = await this.prisma.dealSource.findFirst({
                where: { organizationId: orgId, phone: data.phone },
            });
            if (byPhone)
                return byPhone;
        }
        if (data.facebookProfileUrl) {
            const byFb = await this.prisma.dealSource.findFirst({
                where: { organizationId: orgId, facebookProfileUrl: data.facebookProfileUrl },
            });
            if (byFb)
                return byFb;
        }
        if (data.email) {
            const byEmail = await this.prisma.dealSource.findFirst({
                where: { organizationId: orgId, email: data.email },
            });
            if (byEmail)
                return byEmail;
        }
        if (data.sourceName) {
            const byName = await this.prisma.dealSource.findFirst({
                where: {
                    organizationId: orgId,
                    sourceName: { equals: data.sourceName, mode: 'insensitive' },
                },
            });
            if (byName)
                return byName;
        }
        return this.prisma.dealSource.create({
            data: {
                organizationId: orgId,
                sourceName: data.sourceName,
                sourceType: data.sourceType || 'JV',
                phone: data.phone,
                email: data.email,
                company: data.company,
                facebookProfileUrl: data.facebookProfileUrl,
                facebookGroupName: data.facebookGroupName,
                reliabilityScore: 50,
                reliabilityLabel: 'NEW_SOURCE',
                totalDealsSubmitted: 1,
                lastDealSubmittedAt: new Date(),
            },
        });
    }
    async findAll(orgId) {
        return this.prisma.dealSource.findMany({
            where: { organizationId: orgId },
            include: { _count: { select: { deals: true } } },
            orderBy: { reliabilityScore: 'desc' },
        });
    }
    async findOne(id) {
        return this.prisma.dealSource.findUnique({
            where: { id },
            include: {
                deals: {
                    select: {
                        id: true, address: true, city: true, state: true,
                        status: true, dealPriorityScore: true, createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });
    }
    async update(id, data) {
        const updated = await this.prisma.dealSource.update({
            where: { id },
            data: { ...data, updatedAt: new Date() },
        });
        return this.recalculateScore(updated.id);
    }
    async recalculateScore(sourceId) {
        const source = await this.prisma.dealSource.findUnique({ where: { id: sourceId } });
        if (!source)
            return null;
        let score = 50;
        if (source.isBlacklisted) {
            return this.prisma.dealSource.update({
                where: { id: sourceId },
                data: { reliabilityScore: 0, reliabilityLabel: 'BLACKLIST' },
            });
        }
        const total = source.totalDealsSubmitted || 1;
        const closeRate = source.dealsClosed / total;
        const interestRate = source.dealsThatGotInterest / total;
        score += Math.round(closeRate * 20);
        score += Math.round(interestRate * 10);
        score -= Math.round((source.missingInfoFrequency || 0) * 15);
        score -= Math.min(source.badInfoCount * 5, 15);
        if (source.hadContractConfirmed)
            score += 5;
        if (source.permissionToMarket)
            score += 5;
        if (source.sendsPhotosQuickly)
            score += 5;
        if (source.providesAccessQuickly)
            score += 5;
        if (source.answersQuestionsClearly)
            score += 5;
        score -= Math.min(source.goesGhostCount * 5, 15);
        if (source.averageResponseTimeMin) {
            if (source.averageResponseTimeMin < 60)
                score += 5;
            else if (source.averageResponseTimeMin > 1440)
                score -= 5;
        }
        if (source.closedRevenueGenerated > 10000)
            score += 5;
        if (source.closedRevenueGenerated > 50000)
            score += 5;
        score = Math.max(0, Math.min(100, score));
        let label = 'NEW_SOURCE';
        if (source.isBlacklisted)
            label = 'BLACKLIST';
        else if (score >= 80 && source.dealsClosed > 0)
            label = 'CLOSED_BEFORE';
        else if (score >= 75)
            label = 'TRUSTED_SOURCE';
        else if (score >= 60)
            label = 'GOOD_SOURCE';
        else if (source.goesGhostCount > 1)
            label = 'SLOW_RESPONSE';
        else if (source.badInfoCount > 1)
            label = 'BAD_INFO_BEFORE';
        else if (score < 35)
            label = 'LOW_QUALITY';
        else if (source.totalDealsSubmitted <= 1)
            label = 'NEW_SOURCE';
        if (source.dealsClosed > 0 && score >= 60)
            label = 'CLOSED_BEFORE';
        return this.prisma.dealSource.update({
            where: { id: sourceId },
            data: { reliabilityScore: score, reliabilityLabel: label },
        });
    }
    async onDealStatusChanged(sourceId, oldStatus, newStatus) {
        if (!sourceId)
            return;
        const updates = {};
        if (newStatus === 'DEAD')
            updates.deadDeals = { increment: 1 };
        if (newStatus === 'OFFER_RECEIVED')
            updates.dealsThatGotOffers = { increment: 1 };
        if (newStatus === 'ASSIGNED')
            updates.dealsAssigned = { increment: 1 };
        if (newStatus === 'CLOSED') {
            updates.dealsClosed = { increment: 1 };
            updates.dealsThatGotInterest = { increment: 1 };
        }
        if (['MATCHED', 'READY_TO_BLAST', 'CAMPAIGN_ACTIVE'].includes(newStatus)) {
            updates.dealsThatGotInterest = { increment: 1 };
        }
        if (Object.keys(updates).length > 0) {
            await this.prisma.dealSource.update({ where: { id: sourceId }, data: updates });
            await this.recalculateScore(sourceId);
        }
    }
    async getReliabilityBadge(label) {
        const badges = {
            NEW_SOURCE: { text: 'New', color: 'blue' },
            TRUSTED_SOURCE: { text: 'Trusted', color: 'green' },
            GOOD_SOURCE: { text: 'Good', color: 'green' },
            SLOW_RESPONSE: { text: 'Slow', color: 'amber' },
            BAD_INFO_BEFORE: { text: 'Bad Info', color: 'orange' },
            LOW_QUALITY: { text: 'Low Quality', color: 'red' },
            CLOSED_BEFORE: { text: 'Closed ✓', color: 'purple' },
            BLACKLIST: { text: 'Blacklist', color: 'red' },
        };
        return badges[label] || { text: 'Unknown', color: 'gray' };
    }
};
exports.DealSourcesService = DealSourcesService;
exports.DealSourcesService = DealSourcesService = DealSourcesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DealSourcesService);
//# sourceMappingURL=deal-sources.service.js.map