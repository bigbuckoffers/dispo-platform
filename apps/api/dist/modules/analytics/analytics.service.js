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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const date_fns_1 = require("date-fns");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrgOverview(orgId, days = 30) {
        const since = (0, date_fns_1.subDays)(new Date(), days);
        const [totalBuyers, activeBuyers, totalDeals, activeDeals, totalOffers, acceptedOffers, campaigns, topBuyers, topZipCodes,] = await Promise.all([
            this.prisma.buyer.count({ where: { organizationId: orgId } }),
            this.prisma.buyer.count({ where: { organizationId: orgId, isActive: true, activityScore: { gte: 20 } } }),
            this.prisma.deal.count({ where: { organizationId: orgId } }),
            this.prisma.deal.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
            this.prisma.offer.count({ where: { deal: { organizationId: orgId }, submittedAt: { gte: since } } }),
            this.prisma.offer.count({ where: { deal: { organizationId: orgId }, status: 'ACCEPTED', respondedAt: { gte: since } } }),
            this.prisma.campaign.findMany({
                where: { organizationId: orgId, sentAt: { gte: since } },
                select: { delivered: true, opened: true, clicked: true, replied: true },
            }),
            this.getTopPerformingBuyers(orgId, 5),
            this.getTopZipCodes(orgId, 10),
        ]);
        const totalDelivered = campaigns.reduce((s, c) => s + c.delivered, 0);
        const totalOpened = campaigns.reduce((s, c) => s + c.opened, 0);
        const totalReplied = campaigns.reduce((s, c) => s + c.replied, 0);
        return {
            buyers: {
                total: totalBuyers,
                active: activeBuyers,
                activePct: totalBuyers > 0 ? ((activeBuyers / totalBuyers) * 100).toFixed(1) : '0',
            },
            deals: {
                total: totalDeals,
                active: activeDeals,
            },
            offers: {
                submitted: totalOffers,
                accepted: acceptedOffers,
                conversionRate: totalOffers > 0 ? ((acceptedOffers / totalOffers) * 100).toFixed(1) : '0',
            },
            outreach: {
                delivered: totalDelivered,
                openRate: totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0',
                replyRate: totalDelivered > 0 ? ((totalReplied / totalDelivered) * 100).toFixed(1) : '0',
            },
            topBuyers,
            topZipCodes,
        };
    }
    async getDealVelocity(orgId, days = 30) {
        const since = (0, date_fns_1.subDays)(new Date(), days);
        const interval = (0, date_fns_1.eachDayOfInterval)({ start: since, end: new Date() });
        const deals = await this.prisma.deal.findMany({
            where: { organizationId: orgId, createdAt: { gte: since } },
            select: { createdAt: true, status: true },
        });
        const byDay = interval.map(day => {
            const key = (0, date_fns_1.format)(day, 'yyyy-MM-dd');
            const dayDeals = deals.filter(d => (0, date_fns_1.format)(new Date(d.createdAt), 'yyyy-MM-dd') === key);
            return {
                date: key,
                created: dayDeals.length,
                active: dayDeals.filter(d => d.status === 'ACTIVE').length,
                closed: dayDeals.filter(d => d.status === 'CLOSED').length,
            };
        });
        return byDay;
    }
    async getBuyerActivityHeatmap(orgId) {
        const events = await this.prisma.buyerEvent.findMany({
            where: {
                buyer: { organizationId: orgId },
                createdAt: { gte: (0, date_fns_1.subDays)(new Date(), 90) },
            },
            select: { eventType: true, createdAt: true },
        });
        const heatmap = {};
        for (const event of events) {
            const d = new Date(event.createdAt);
            const key = `${d.getDay()}-${d.getHours()}`;
            heatmap[key] = (heatmap[key] ?? 0) + 1;
        }
        return heatmap;
    }
    async getAssignmentFeeReport(orgId) {
        const purchases = await this.prisma.purchaseHistory.findMany({
            where: { buyer: { organizationId: orgId } },
            select: { purchasePrice: true, assignmentFeePaid: true, closedAt: true },
            orderBy: { closedAt: 'desc' },
        });
        const total = purchases.reduce((s, p) => s + (p.assignmentFeePaid ?? 0), 0);
        const avg = purchases.length > 0 ? total / purchases.length : 0;
        const highest = Math.max(...purchases.map(p => p.assignmentFeePaid ?? 0));
        return {
            totalFees: total,
            avgFee: avg,
            highestFee: highest,
            totalTransactions: purchases.length,
            byMonth: this.groupByMonth(purchases),
        };
    }
    async getDispoRepPerformance(orgId) {
        const reps = await this.prisma.teamMember.findMany({
            where: {
                organizationId: orgId,
                role: { in: ['DISPO_REP', 'ADMIN', 'OWNER'] },
            },
            include: { user: true },
        });
        const performance = await Promise.all(reps.map(async (rep) => {
            const [campaigns, deals, offers] = await Promise.all([
                this.prisma.campaign.count({ where: { organizationId: orgId } }),
                this.prisma.deal.count({ where: { organizationId: orgId, acquisitionRepId: rep.userId } }),
                this.prisma.offer.count({ where: { submittedById: rep.userId, status: 'ACCEPTED' } }),
            ]);
            return {
                repId: rep.userId,
                name: `${rep.user.firstName} ${rep.user.lastName}`,
                dealsIntaken: deals,
                offersAccepted: offers,
                campaigns,
            };
        }));
        return performance;
    }
    async getTopPerformingBuyers(orgId, limit) {
        return this.prisma.buyer.findMany({
            where: { organizationId: orgId, isActive: true },
            orderBy: { compositeScore: 'desc' },
            take: limit,
            select: {
                id: true, firstName: true, lastName: true,
                compositeScore: true, tier: true, investorType: true,
                _count: { select: { purchases: true, offers: true } },
            },
        });
    }
    async getTopZipCodes(orgId, limit) {
        const deals = await this.prisma.deal.findMany({
            where: { organizationId: orgId },
            select: { zipCode: true, city: true, state: true },
        });
        const zipCounts = {};
        for (const d of deals) {
            if (!zipCounts[d.zipCode])
                zipCounts[d.zipCode] = { count: 0, city: d.city, state: d.state };
            zipCounts[d.zipCode].count++;
        }
        return Object.entries(zipCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, limit)
            .map(([zip, data]) => ({ zip, ...data }));
    }
    groupByMonth(items) {
        const grouped = {};
        for (const item of items) {
            const key = (0, date_fns_1.format)(new Date(item.closedAt), 'yyyy-MM');
            grouped[key] = (grouped[key] ?? 0) + (item.assignmentFeePaid ?? 0);
        }
        return grouped;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map