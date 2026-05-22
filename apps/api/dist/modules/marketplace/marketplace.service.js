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
exports.MarketplaceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
let MarketplaceService = class MarketplaceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPublicListings(query) {
        const { page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const [listings, total] = await Promise.all([
            this.prisma.marketplaceListing.findMany({
                where: { visibility: 'PUBLIC' },
                skip, take: +limit,
                orderBy: [{ publishedAt: 'desc' }],
            }),
            this.prisma.marketplaceListing.count({ where: { visibility: 'PUBLIC' } }),
        ]);
        return { data: listings, meta: { total, page: +page, limit: +limit } };
    }
    async publishDeal(dealId, orgId) {
        const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId: orgId } });
        if (!deal)
            throw new common_1.NotFoundException('Deal not found');
        return this.prisma.marketplaceListing.upsert({
            where: { dealId },
            create: { dealId, organizationId: orgId, visibility: 'PUBLIC', publishedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
            update: { visibility: 'PUBLIC', publishedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        });
    }
    async saveDeal(buyerId, dealId, notes) {
        return this.prisma.savedDeal.upsert({
            where: { buyerId_dealId: { buyerId, dealId } },
            create: { buyerId, dealId, notes },
            update: { notes },
        });
    }
    async getSavedDeals(buyerId) {
        return this.prisma.savedDeal.findMany({
            where: { buyerId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async incrementViewCount(dealId) {
        await this.prisma.marketplaceListing.updateMany({
            where: { dealId }, data: { viewCount: { increment: 1 } },
        });
    }
};
exports.MarketplaceService = MarketplaceService;
exports.MarketplaceService = MarketplaceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MarketplaceService);
//# sourceMappingURL=marketplace.service.js.map