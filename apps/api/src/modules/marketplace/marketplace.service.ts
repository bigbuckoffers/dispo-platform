import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async getPublicListings(query: any) {
    const { page = 1, limit = 20, state, minPrice, maxPrice, propertyType } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      visibility: 'PUBLIC',
      expiresAt: { gt: new Date() },
      deal: {
        status: 'ACTIVE',
        ...(state && { state }),
        ...(propertyType && { propertyType }),
        ...(minPrice || maxPrice) && {
          askingPrice: {
            ...(minPrice && { gte: parseFloat(minPrice) }),
            ...(maxPrice && { lte: parseFloat(maxPrice) }),
          },
        },
      },
    };

    const [listings, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where,
        skip,
        take: +limit,
        orderBy: [{ featuredUntil: 'desc' }, { publishedAt: 'desc' }],
        include: {
          deal: {
            select: {
              id: true, address: true, city: true, state: true, zipCode: true,
              askingPrice: true, arv: true, repairEstimate: true,
              beds: true, baths: true, sqft: true, yearBuilt: true,
              propertyType: true, occupancy: true, photos: true,
              flipScore: true, landlordScore: true, cashBuyerDemand: true,
            },
          },
        },
      }),
      this.prisma.marketplaceListing.count({ where }),
    ]);

    return { data: listings, meta: { total, page: +page, limit: +limit } };
  }

  async publishDeal(dealId: string, orgId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId: orgId } });
    if (!deal) throw new NotFoundException('Deal not found');

    return this.prisma.marketplaceListing.upsert({
      where: { dealId },
      create: {
        dealId,
        organizationId: orgId,
        visibility: 'PUBLIC',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      update: {
        visibility: 'PUBLIC',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
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
      include: {
        deal: {
          select: {
            id: true, address: true, city: true, state: true,
            askingPrice: true, arv: true, propertyType: true, status: true,
          },
        },
      },
    });
  }

  async incrementViewCount(dealId: string) {
    await this.prisma.marketplaceListing.updateMany({
      where: { dealId },
      data: { viewCount: { increment: 1 } },
    });
  }
}
