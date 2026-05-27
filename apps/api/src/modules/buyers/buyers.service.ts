import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BuyerTier, BuyerEventType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

import { CreateBuyerDto } from './dto/create-buyer.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';
import { UpdateBuyBoxDto } from './dto/update-buy-box.dto';
import { ListBuyersDto } from './dto/list-buyers.dto';

@Injectable()
export class BuyersService {
  private readonly logger = new Logger(BuyersService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(orgId: string, query: ListBuyersDto) {
    const {
      page = 1, limit = 25, tier, search, sortBy = 'compositeScore',
      isActive = true, investorType, minScore,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: orgId,
      isActive,
      isSuspended: false,
      ...(tier && { tier }),
      ...(investorType && { investorType }),
      ...(minScore && { compositeScore: { gte: minScore } }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: any = (() => {
      switch (sortBy) {
        case 'reliability': return { reliabilityScore: 'desc' };
        case 'liquidity': return { liquidityScore: 'desc' };
        case 'activity': return { activityScore: 'desc' };
        case 'name': return { firstName: 'asc' };
        case 'createdAt': return { createdAt: 'desc' };
        default: return { compositeScore: 'desc' };
      }
    })();

    const [buyers, total] = await Promise.all([
      this.prisma.buyer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          buyBox: { select: { states: true, minPrice: true, maxPrice: true, propertyTypes: true } },
          _count: { select: { offers: true, purchases: true } },
        },
      }),
      this.prisma.buyer.count({ where }),
    ]);

    return {
      data: buyers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(orgId: string, userId: string, dto: CreateBuyerDto) {
    const buyer = await this.prisma.buyer.create({
      data: {
        organizationId: orgId,
        ...dto,
        buyBox: dto.buyBox ? { create: dto.buyBox as any } : undefined,
      },
      include: { buyBox: true },
    });

    await this.prisma.buyerEvent.create({
      data: { buyerId: buyer.id, eventType: BuyerEventType.PROFILE_CREATED },
    });

    this.eventEmitter.emit('buyer.created', { buyerId: buyer.id, orgId });
    return buyer;
  }

  async findOne(orgId: string, id: string) {
    const buyer = await this.prisma.buyer.findFirst({
      where: { id, organizationId: orgId },
      include: {
        buyBox: true,
        realBuyBox: true,
        _count: {
          select: {
            offers: true,
            purchases: true,
            events: true,
            dealViews: true,
          },
        },
      },
    });
    if (!buyer) throw new NotFoundException('Buyer not found');
    return buyer;
  }

  async update(orgId: string, id: string, dto: UpdateBuyerDto, userId: string) {
    await this.findOne(orgId, id);
    const buyer = await this.prisma.buyer.update({
      where: { id },
      data: dto as any,
    });
    return buyer;
  }

  async getScores(orgId: string, id: string) {
    const buyer = await this.findOne(orgId, id);
    const history = await this.prisma.buyerScoreHistory.findMany({
      where: { buyerId: id },
      orderBy: { computedAt: 'desc' },
      take: 30,
    });
    return {
      current: {
        reliability: buyer.reliabilityScore,
        liquidity: buyer.liquidityScore,
        activity: buyer.activityScore,
        composite: buyer.compositeScore,
      },
      history,
      tier: buyer.tier,
    };
  }

  async recalculateScores(orgId: string, buyerId: string) {
    await this.findOne(orgId, buyerId);
    const scores = await this.computeBuyerScores(buyerId);
    await this.prisma.buyer.update({
      where: { id: buyerId },
      data: scores,
    });
    await this.prisma.buyerScoreHistory.create({
      data: { buyerId, ...scores },
    });
    return scores;
  }

  async computeBuyerScores(buyerId: string): Promise<{
    reliabilityScore: number;
    liquidityScore: number;
    activityScore: number;
    compositeScore: number;
  }> {
    const [events, offers, purchases, views] = await Promise.all([
      this.prisma.buyerEvent.findMany({
        where: { buyerId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.offer.findMany({ where: { buyerId } }),
      this.prisma.purchaseHistory.findMany({ where: { buyerId } }),
      this.prisma.dealView.count({ where: { buyerId } }),
    ]);

    // ── RELIABILITY SCORE ──────────────────────────────────────────────────
    const totalOffers = offers.length;
    const closedOffers = offers.filter(o => o.status === 'ACCEPTED').length;
    const cancelledOffers = offers.filter(o => o.status === 'WITHDRAWN' || o.isCancelled).length;
    const retradedOffers = offers.filter(o => o.isRetrade).length;
    const closeRate = totalOffers > 0 ? closedOffers / totalOffers : 0;
    const retradePct = totalOffers > 0 ? retradedOffers / totalOffers : 0;
    const cancelPct = totalOffers > 0 ? cancelledOffers / totalOffers : 0;

    // Ghost rate: submitted offers with no activity in 7 days
    const ghostEvents = events.filter(e => e.eventType === 'DEAL_VIEWED').length;
    const ghostRate = views > 0 ? Math.max(0, 1 - (totalOffers / Math.max(views, 1))) * 0.3 : 0.5;

    // Speed factor: average days to close (lower = better)
    const closedWithDate = purchases.filter(p => p.closedAt);
    const avgDaysToClose = closedWithDate.length > 0
      ? closedWithDate.reduce((sum, p) => {
          const days = (new Date(p.closedAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return sum + Math.abs(days);
        }, 0) / closedWithDate.length
      : 30;
    const speedFactor = Math.max(0, 1 - (avgDaysToClose / 60));

    const reliabilityScore = Math.round(
      ((closeRate * 0.45) + ((1 - retradePct) * 0.25) + ((1 - cancelPct) * 0.15) + (speedFactor * 0.10) + ((1 - ghostRate) * 0.05)) * 100
    );

    // ── LIQUIDITY SCORE ────────────────────────────────────────────────────
    const buyer = await this.prisma.buyer.findUnique({ where: { id: buyerId } });
    const hasCashScore = buyer?.hasCash ? 30 : 0;
    const hasHardMoneyScore = buyer?.hasHardMoney ? 15 : 0;
    const avgPurchasePrice = purchases.length > 0
      ? purchases.reduce((s, p) => s + p.purchasePrice, 0) / purchases.length : 0;
    const purchasePriceScore = Math.min(30, (avgPurchasePrice / 500000) * 30);
    const recentPurchases = purchases.filter(p => {
      const days = (Date.now() - new Date(p.closedAt).getTime()) / (1000 * 60 * 60 * 24);
      return days < 365;
    }).length;
    const velocityScore = Math.min(25, recentPurchases * 5);
    const liquidityScore = Math.round(hasCashScore + hasHardMoneyScore + purchasePriceScore + velocityScore);

    // ── ACTIVITY SCORE (30-day recency) ────────────────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEvents = events.filter(e => new Date(e.createdAt) > thirtyDaysAgo);
    const recentViews = recentEvents.filter(e => e.eventType === 'DEAL_VIEWED').length;
    const recentOffers = recentEvents.filter(e => e.eventType === 'OFFER_SUBMITTED').length;
    const recentOpens = recentEvents.filter(e => e.eventType === 'EMAIL_OPENED' || e.eventType === 'SMS_OPENED').length;
    const recentSaves = recentEvents.filter(e => e.eventType === 'DEAL_SAVED').length;

    const activityScore = Math.min(100, Math.round(
      recentViews * 3 + recentOffers * 25 + recentOpens * 5 + recentSaves * 8
    ));

    // ── COMPOSITE ──────────────────────────────────────────────────────────
    const compositeScore = Math.round(
      reliabilityScore * 0.40 + liquidityScore * 0.30 + activityScore * 0.30
    );

    return {
      reliabilityScore: Math.min(100, Math.max(0, reliabilityScore)),
      liquidityScore: Math.min(100, Math.max(0, liquidityScore)),
      activityScore: Math.min(100, Math.max(0, activityScore)),
      compositeScore: Math.min(100, Math.max(0, compositeScore)),
    };
  }

  async getBuyBox(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.buyBox.findUnique({ where: { buyerId: id } });
  }

  async updateBuyBox(orgId: string, id: string, dto: UpdateBuyBoxDto, userId: string) {
    await this.findOne(orgId, id);
    const buyBox = await this.prisma.buyBox.upsert({
      where: { buyerId: id },
      create: { buyerId: id, ...dto } as any,
      update: dto as any,
    });
    // Trigger re-embedding since buy box changed
    this.eventEmitter.emit('buyer.buybox.updated', { buyerId: id, orgId });
    return buyBox;
  }

  async getRealBuyBox(orgId: string, id: string) {
    await this.findOne(orgId, id);
    const [stated, real] = await Promise.all([
      this.prisma.buyBox.findUnique({ where: { buyerId: id } }),
      this.prisma.realBuyBox.findUnique({ where: { buyerId: id } }),
    ]);
    return {
      stated,
      real,
      divergenceScore: real?.divergenceFromStated ?? 0,
      dataPoints: real?.dataPointCount ?? 0,
      lastUpdated: real?.lastUpdated,
    };
  }

  async getActivityTimeline(orgId: string, id: string, days: number) {
    await this.findOne(orgId, id);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await this.prisma.buyerEvent.findMany({
      where: { buyerId: id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return events;
  }

  async getAnalytics(orgId: string, id: string) {
    await this.findOne(orgId, id);
    const [offers, purchases, views] = await Promise.all([
      this.prisma.offer.findMany({ where: { buyerId: id } }),
      this.prisma.purchaseHistory.findMany({ where: { buyerId: id } }),
      this.prisma.dealView.count({ where: { buyerId: id } }),
    ]);

    const totalOffers = offers.length;
    const accepted = offers.filter(o => o.status === 'ACCEPTED').length;
    const retraded = offers.filter(o => o.isRetrade).length;
    const totalPurchases = purchases.length;
    const totalAssignmentFees = purchases.reduce((s, p) => s + (p.assignmentFeePaid ?? 0), 0);
    const avgAssignmentFee = totalPurchases > 0 ? totalAssignmentFees / totalPurchases : 0;

    return {
      totalDealsViewed: views,
      totalOffers,
      offerAcceptanceRate: totalOffers > 0 ? (accepted / totalOffers * 100).toFixed(1) : '0',
      retradeRate: totalOffers > 0 ? (retraded / totalOffers * 100).toFixed(1) : '0',
      totalPurchases,
      avgAssignmentFeePaid: avgAssignmentFee,
      totalAssignmentFeesPaid: totalAssignmentFees,
      ghostRate: views > 0 ? ((views - totalOffers) / views * 100).toFixed(1) : '0',
    };
  }

  async getTopBuyers(orgId: string, limit: number) {
    return this.prisma.buyer.findMany({
      where: { organizationId: orgId, isActive: true, isSuspended: false },
      orderBy: { compositeScore: 'desc' },
      take: limit,
      select: {
        id: true, firstName: true, lastName: true, email: true,
        compositeScore: true, reliabilityScore: true, liquidityScore: true,
        activityScore: true, tier: true, investorType: true,
        buyBox: { select: { states: true, minPrice: true, maxPrice: true } },
      },
    });
  }

  async updateTier(orgId: string, id: string, tier: BuyerTier, userId: string) {
    await this.findOne(orgId, id);
    return this.prisma.buyer.update({ where: { id }, data: { tier } });
  }

  async suspend(orgId: string, id: string, reason: string, userId: string) {
    await this.findOne(orgId, id);
    return this.prisma.buyer.update({
      where: { id },
      data: { isSuspended: true, suspendedReason: reason },
    });
  }

  async remove(orgId: string, id: string, userId: string) {
    await this.findOne(orgId, id);
    await this.prisma.buyer.update({ where: { id }, data: { isActive: false } });
  }
}
