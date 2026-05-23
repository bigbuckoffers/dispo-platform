import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

export const RELIABILITY_LABELS = {
  NEW_SOURCE: 'New Source',
  TRUSTED_SOURCE: 'Trusted Source',
  GOOD_SOURCE: 'Good Source',
  SLOW_RESPONSE: 'Slow Response',
  BAD_INFO_BEFORE: 'Bad Info Before',
  LOW_QUALITY: 'Low Quality',
  CLOSED_BEFORE: 'Closed Before',
  BLACKLIST: 'Blacklist',
};

@Injectable()
export class DealSourcesService {
  private readonly logger = new Logger(DealSourcesService.name);

  constructor(private prisma: PrismaService) {}

  // Find or create a source by phone, facebook URL, email, or name
  async getDefaultOrgId(): Promise<string> {
    const org = await this.prisma.organization.findFirst();
    return org?.id || '';
  }

  async findOrCreate(orgId: string, data: {
    sourceName?: string;
    sourceType?: string;
    phone?: string;
    email?: string;
    company?: string;
    facebookProfileUrl?: string;
    facebookGroupName?: string;
  }): Promise<any> {
    // Try to find existing source by phone first (strongest match)
    if (data.phone) {
      const byPhone = await this.prisma.dealSource.findFirst({
        where: { organizationId: orgId, phone: data.phone },
      });
      if (byPhone) return byPhone;
    }

    // Try Facebook profile URL
    if (data.facebookProfileUrl) {
      const byFb = await this.prisma.dealSource.findFirst({
        where: { organizationId: orgId, facebookProfileUrl: data.facebookProfileUrl },
      });
      if (byFb) return byFb;
    }

    // Try email
    if (data.email) {
      const byEmail = await this.prisma.dealSource.findFirst({
        where: { organizationId: orgId, email: data.email },
      });
      if (byEmail) return byEmail;
    }

    // Try name + company (exact match)
    if (data.sourceName) {
      const byName = await this.prisma.dealSource.findFirst({
        where: {
          organizationId: orgId,
          sourceName: { equals: data.sourceName, mode: 'insensitive' },
        },
      });
      if (byName) return byName;
    }

    // Create new source
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

  async findAll(orgId: string) {
    return this.prisma.dealSource.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { deals: true } } },
      orderBy: { reliabilityScore: 'desc' },
    });
  }

  async findOne(id: string) {
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

  async update(id: string, data: any) {
    const updated = await this.prisma.dealSource.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
    // Recalculate reliability score after update
    return this.recalculateScore(updated.id);
  }

  async recalculateScore(sourceId: string): Promise<any> {
    const source = await this.prisma.dealSource.findUnique({ where: { id: sourceId } });
    if (!source) return null;

    let score = 50; // base

    // Blacklist override
    if (source.isBlacklisted) {
      return this.prisma.dealSource.update({
        where: { id: sourceId },
        data: { reliabilityScore: 0, reliabilityLabel: 'BLACKLIST' },
      });
    }

    // Deal history (up to 30 pts)
    const total = source.totalDealsSubmitted || 1;
    const closeRate = source.dealsClosed / total;
    const interestRate = source.dealsThatGotInterest / total;
    score += Math.round(closeRate * 20);
    score += Math.round(interestRate * 10);

    // Accuracy / info quality (up to 20 pts)
    score -= Math.round((source.missingInfoFrequency || 0) * 15);
    score -= Math.min(source.badInfoCount * 5, 15);
    if (source.hadContractConfirmed) score += 5;
    if (source.permissionToMarket) score += 5;

    // Communication (up to 20 pts)
    if (source.sendsPhotosQuickly) score += 5;
    if (source.providesAccessQuickly) score += 5;
    if (source.answersQuestionsClearly) score += 5;
    score -= Math.min(source.goesGhostCount * 5, 15);
    if (source.averageResponseTimeMin) {
      if (source.averageResponseTimeMin < 60) score += 5;
      else if (source.averageResponseTimeMin > 1440) score -= 5;
    }

    // Revenue generated (up to 10 pts)
    if (source.closedRevenueGenerated > 10000) score += 5;
    if (source.closedRevenueGenerated > 50000) score += 5;

    score = Math.max(0, Math.min(100, score));

    // Determine label
    let label = 'NEW_SOURCE';
    if (source.isBlacklisted) label = 'BLACKLIST';
    else if (score >= 80 && source.dealsClosed > 0) label = 'CLOSED_BEFORE';
    else if (score >= 75) label = 'TRUSTED_SOURCE';
    else if (score >= 60) label = 'GOOD_SOURCE';
    else if (source.goesGhostCount > 1) label = 'SLOW_RESPONSE';
    else if (source.badInfoCount > 1) label = 'BAD_INFO_BEFORE';
    else if (score < 35) label = 'LOW_QUALITY';
    else if (source.totalDealsSubmitted <= 1) label = 'NEW_SOURCE';

    // Override: if they've closed before, always show it
    if (source.dealsClosed > 0 && score >= 60) label = 'CLOSED_BEFORE';

    return this.prisma.dealSource.update({
      where: { id: sourceId },
      data: { reliabilityScore: score, reliabilityLabel: label },
    });
  }

  // Called when a deal status changes
  async onDealStatusChanged(sourceId: string, oldStatus: string, newStatus: string) {
    if (!sourceId) return;
    const updates: any = {};

    if (newStatus === 'DEAD') updates.deadDeals = { increment: 1 };
    if (newStatus === 'OFFER_RECEIVED') updates.dealsThatGotOffers = { increment: 1 };
    if (newStatus === 'ASSIGNED') updates.dealsAssigned = { increment: 1 };
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

  async getReliabilityBadge(label: string): Promise<{ text: string; color: string }> {
    const badges: Record<string, { text: string; color: string }> = {
      NEW_SOURCE:     { text: 'New',         color: 'blue' },
      TRUSTED_SOURCE: { text: 'Trusted',     color: 'green' },
      GOOD_SOURCE:    { text: 'Good',        color: 'green' },
      SLOW_RESPONSE:  { text: 'Slow',        color: 'amber' },
      BAD_INFO_BEFORE:{ text: 'Bad Info',    color: 'orange' },
      LOW_QUALITY:    { text: 'Low Quality', color: 'red' },
      CLOSED_BEFORE:  { text: 'Closed ✓',   color: 'purple' },
      BLACKLIST:      { text: 'Blacklist',   color: 'red' },
    };
    return badges[label] || { text: 'Unknown', color: 'gray' };
  }
}
