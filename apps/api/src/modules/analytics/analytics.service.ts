import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { subDays, startOfDay, eachDayOfInterval, format } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOrgOverview(orgId: string, days = 30) {
    const since = subDays(new Date(), days);

    const [
      totalBuyers,
      activeBuyers,
      totalDeals,
      activeDeals,
      totalOffers,
      acceptedOffers,
      campaigns,
      topBuyers,
      topZipCodes,
    ] = await Promise.all([
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

  async getDealVelocity(orgId: string, days = 30) {
    const since = subDays(new Date(), days);
    const interval = eachDayOfInterval({ start: since, end: new Date() });

    const deals = await this.prisma.deal.findMany({
      where: { organizationId: orgId, createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    });

    const byDay = interval.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      const dayDeals = deals.filter(d => format(new Date(d.createdAt), 'yyyy-MM-dd') === key);
      return {
        date: key,
        created: dayDeals.length,
        active: dayDeals.filter(d => d.status === 'ACTIVE').length,
        closed: dayDeals.filter(d => d.status === 'CLOSED').length,
      };
    });

    return byDay;
  }

  async getBuyerActivityHeatmap(orgId: string) {
    const events = await this.prisma.buyerEvent.findMany({
      where: {
        buyer: { organizationId: orgId },
        createdAt: { gte: subDays(new Date(), 90) },
      },
      select: { eventType: true, createdAt: true },
    });

    // Group by day of week + hour
    const heatmap: Record<string, number> = {};
    for (const event of events) {
      const d = new Date(event.createdAt);
      const key = `${d.getDay()}-${d.getHours()}`;
      heatmap[key] = (heatmap[key] ?? 0) + 1;
    }

    return heatmap;
  }

  async getAssignmentFeeReport(orgId: string) {
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

  async getDispoRepPerformance(orgId: string) {
    const reps = await this.prisma.teamMember.findMany({
      where: {
        organizationId: orgId,
        role: { in: ['DISPO_REP', 'ADMIN', 'OWNER'] },
      },
      include: { user: true },
    });

    const performance = await Promise.all(
      reps.map(async (rep) => {
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
      })
    );

    return performance;
  }

  private async getTopPerformingBuyers(orgId: string, limit: number) {
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

  private async getTopZipCodes(orgId: string, limit: number) {
    const deals = await this.prisma.deal.findMany({
      where: { organizationId: orgId },
      select: { zipCode: true, city: true, state: true },
    });

    const zipCounts: Record<string, { count: number; city: string; state: string }> = {};
    for (const d of deals) {
      if (!zipCounts[d.zipCode]) zipCounts[d.zipCode] = { count: 0, city: d.city, state: d.state };
      zipCounts[d.zipCode].count++;
    }

    return Object.entries(zipCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, limit)
      .map(([zip, data]) => ({ zip, ...data }));
  }

  private groupByMonth(items: any[]) {
    const grouped: Record<string, number> = {};
    for (const item of items) {
      const key = format(new Date(item.closedAt), 'yyyy-MM');
      grouped[key] = (grouped[key] ?? 0) + (item.assignmentFeePaid ?? 0);
    }
    return grouped;
  }
}
