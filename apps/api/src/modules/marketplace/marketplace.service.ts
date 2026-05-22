import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async getPublicListings(query: any) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const [listings, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where: { visibility: 'PUBLIC' as any },
        skip, take: +limit,
        orderBy: [{ publishedAt: 'desc' }],
      }),
      this.prisma.marketplaceListing.count({ where: { visibility: 'PUBLIC' as any } }),
    ]);
    return { data: listings, meta: { total, page: +page, limit: +limit } };
  }

  async publishDeal(dealId: string, orgId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId: orgId } });
    if (!deal) throw new NotFoundException('Deal not found');
    return this.prisma.marketplaceListing.upsert({
      where: { dealId },
      create: { dealId, organizationId: orgId, visibility: 'PUBLIC' as any, publishedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      update: { visibility: 'PUBLIC' as any, publishedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
  }

  async saveDeal(buyerId: string, dealId: string, notes?: string) {
    return this.prisma.savedDeal.upsert({
      where: { buyerId_dealId: { buyerId, dealId } },
      create: { buyerId, dealId, notes },
      update: { notes },
    });
  }

  async getSavedDeals(buyerId: string) {
    return this.prisma.savedDeal.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementViewCount(dealId: string) {
    await this.prisma.marketplaceListing.updateMany({
      where: { dealId }, data: { viewCount: { increment: 1 } },
    });
  }
}
