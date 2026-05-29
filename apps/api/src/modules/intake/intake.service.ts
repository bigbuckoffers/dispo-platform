import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { BuyerIntakeEventType, BuyerIntakeStatus, NotificationType } from '@prisma/client';

const INTAKE_EVENT_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

type LogIntakeEventInput = {
  buyerId: string;
  intakeToken?: string | null;
  eventType: BuyerIntakeEventType;
  metadata?: any;
  createdBy?: string | null;
  source?: string | null;
};

@Injectable()
export class IntakeService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async generateToken(buyerId: string): Promise<string> {
    // Return existing token if buyer already has one
    const existing = await this.prisma.buyer.findUnique({
      where: { id: buyerId },
      select: { intakeToken: true },
    });
    if (existing?.intakeToken) return existing.intakeToken;
    // Generate new token only if none exists
    const token = crypto.randomBytes(16).toString('hex');
    await this.prisma.buyer.update({
      where: { id: buyerId },
      data: { intakeToken: token },
    });
    await this.logIntakeEvent({
      buyerId,
      intakeToken: token,
      eventType: BuyerIntakeEventType.INTAKE_LINK_CREATED,
      source: 'api',
    });
    return token;
  }

  async getBuyerByToken(token: string) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { intakeToken: token },
      include: { buyBox: true },
    });
    if (!buyer) throw new NotFoundException('Invalid or expired link');
    return {
      id: buyer.id,
      firstName: buyer.firstName,
      lastName: buyer.lastName,
      phone: buyer.phone,
      email: buyer.email?.includes('@import.dispoai.com') ? '' : buyer.email,
      marketPrimary: buyer.marketPrimary,
      marketSecondary: buyer.marketSecondary,
      preferredStrategies: buyer.preferredStrategies,
      notes: buyer.notes,
      buyBox: buyer.buyBox,
    };
  }

  async logOpened(token: string, metadata: any = {}) {
    return this.logTokenEvent(token, BuyerIntakeEventType.INTAKE_LINK_OPENED, metadata, 'intake_form');
  }

  async logStarted(token: string, metadata: any = {}) {
    return this.logTokenEvent(token, BuyerIntakeEventType.INTAKE_FORM_STARTED, metadata, 'intake_form');
  }

  async markLinkSent(token: string, metadata: any = {}) {
    return this.logTokenEvent(token, BuyerIntakeEventType.INTAKE_LINK_SENT, metadata, 'api');
  }

  async logTokenEvent(
    token: string,
    eventType: BuyerIntakeEventType,
    metadata: any = {},
    source = 'api',
  ) {
    const buyer = await this.prisma.buyer.findUnique({ where: { intakeToken: token }, select: { id: true } });
    if (!buyer) return { ok: false };
    const event = await this.logIntakeEvent({
      buyerId: buyer.id,
      intakeToken: token,
      eventType,
      metadata,
      source,
    });
    return { ok: true, event };
  }

  async submitIntake(token: string, data: any = {}) {
    const buyer = await this.prisma.buyer.findUnique({ where: { intakeToken: token } });
    if (!buyer) throw new NotFoundException('Invalid or expired link');
    const isComplete = !data._partial;
    const status = isComplete ? 'SUBMITTED' : 'IN_PROGRESS';
    const existing = await this.prisma.buyerIntakeSubmission.findFirst({
      where: { buyerId: buyer.id, status: { in: ['IN_PROGRESS', 'PENDING'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      // Update existing in-progress record
      await this.prisma.buyerIntakeSubmission.update({
        where: { id: existing.id },
        data: { submittedData: data, status },
      });
    } else {
      // Always create new record if completing (no in-progress found)
      await this.prisma.buyerIntakeSubmission.create({
        data: { buyerId: buyer.id, status, submittedData: data },
      });
    }

    await this.logIntakeEvent({
      buyerId: buyer.id,
      intakeToken: token,
      eventType: isComplete
        ? BuyerIntakeEventType.INTAKE_FORM_SUBMITTED
        : BuyerIntakeEventType.INTAKE_FORM_STARTED,
      metadata: { partial: !isComplete },
      source: 'intake_form',
    });

    if (isComplete) {
      try {
        const org = await this.prisma.organization.findFirst({ include: { members: { include: { user: true }, take: 1 } } });
        const userId = org?.members?.[0]?.user?.id;
        const buyerName = `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || buyer.phone;
        if (userId) {
          await this.notifications.create(userId, NotificationType.SYSTEM, '📬 New Buy Box Submission', `${buyerName} just submitted their buy box`, '/dashboard/buyers?tab=submissions');
        }
      } catch {}
    }
    return { success: true, message: 'Buy box submitted successfully' };
  }

  async getPendingSubmissions(orgId: string) {
    return this.prisma.buyerIntakeSubmission.findMany({
      where: { status: { in: ['IN_PROGRESS', 'SUBMITTED', 'PENDING'] }, buyer: { organizationId: orgId } },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: {
          include: { buyBox: true },
        },
      },
    });
  }

  async approveSubmission(submissionId: string, approvedFields: any) {
    const sub = await this.prisma.buyerIntakeSubmission.findUnique({
      where: { id: submissionId }, include: { buyer: true },
    });
    if (!sub) throw new NotFoundException('Submission not found');

    const { buyBoxFields, buyerFields } = approvedFields;

    if (buyerFields && Object.keys(buyerFields).length > 0) {
      const tempNoteFields = ['buyingStatus','monthlyCapacity','occupancy','hoaOk','minArv','minProfit',
        'maxRehab','minCashFlow','hardNoCriteria','maxEmd','inspectionDays','preferredContact',
        'dealSendFreq','excludedAreas','privateNotes','propertyTypes','minYearBuilt','maxYearBuilt'];
      const directFields: any = {};
      const statusFields: any = {};
      for (const [k, v] of Object.entries(buyerFields)) {
        if (tempNoteFields.includes(k)) { statusFields[k] = v; } else { directFields[k] = v; }
      }
      if (Object.keys(directFields).length > 0) {
        await this.prisma.buyer.update({ where: { id: sub.buyerId }, data: directFields });
      }
      if (Object.keys(statusFields).length > 0) {
        let existing: any = {};
        try { if (sub.buyer.temperatureNotes) existing = JSON.parse(sub.buyer.temperatureNotes as string); } catch {}
        const merged = { ...existing, ...statusFields };
        await this.prisma.buyer.update({ where: { id: sub.buyerId }, data: { temperatureNotes: JSON.stringify(merged) } });
      }
    }
    // Save freeform notes to buyerIntelNotes
    const submittedData = sub.submittedData as any;
    if (submittedData?.freeformNotes) {
      const existing = sub.buyer.buyerIntelNotes || '';
      const newNotes = existing ? existing + '\n\n[Intake Form]\n' + submittedData.freeformNotes : '[Intake Form]\n' + submittedData.freeformNotes;
      await this.prisma.buyer.update({
        where: { id: sub.buyerId },
        data: { buyerIntelNotes: newNotes },
      });
    }

    if (buyBoxFields && Object.keys(buyBoxFields).length > 0) {
      await this.prisma.buyBox.upsert({
        where: { buyerId: sub.buyerId },
        create: { buyerId: sub.buyerId, ...buyBoxFields },
        update: buyBoxFields,
      });
    }

    await this.prisma.buyerIntakeSubmission.update({
      where: { id: submissionId },
      data: { status: 'APPROVED', reviewedAt: new Date() },
    });

    return { success: true };
  }

  async rejectSubmission(submissionId: string) {
    await this.prisma.buyerIntakeSubmission.update({
      where: { id: submissionId },
      data: { status: 'REJECTED', reviewedAt: new Date() },
    });
    return { success: true };
  }

  async generateBulkTokens(orgId: string): Promise<{ buyerId: string; token: string; phone: string }[]> {
    const buyers = await this.prisma.buyer.findMany({
      where: { organizationId: orgId, phone: { not: null } },
      select: { id: true, phone: true, intakeToken: true },
    });
    const results = [];
    for (const buyer of buyers) {
      const token = buyer.intakeToken || crypto.randomBytes(16).toString('hex');
      if (!buyer.intakeToken) {
        await this.prisma.buyer.update({ where: { id: buyer.id }, data: { intakeToken: token } });
        await this.logIntakeEvent({
          buyerId: buyer.id,
          intakeToken: token,
          eventType: BuyerIntakeEventType.INTAKE_LINK_CREATED,
          source: 'api',
          metadata: { bulk: true },
        });
      }
      results.push({ buyerId: buyer.id, token, phone: buyer.phone });
    }
    return results;
  }

  async trackEvent(token: string, event: string, metadata: any = {}) {
    const legacyEvents: any = {
      INTAKE_OPENED: 'INTAKE_OPENED', INTAKE_STEP_2: 'INTAKE_STEP_2',
      INTAKE_STEP_3: 'INTAKE_STEP_3', INTAKE_STEP_4: 'INTAKE_STEP_4',
      INTAKE_STEP_5: 'INTAKE_STEP_5', INTAKE_STEP_6: 'INTAKE_STEP_6',
      INTAKE_COMPLETED: 'INTAKE_COMPLETED', INTAKE_ABANDONED: 'INTAKE_ABANDONED',
    };
    const intakeEvent = this.mapLegacyTrackEvent(event);
    if (!legacyEvents[event] && !intakeEvent) return { ok: false, error: 'Invalid event' };

    const buyer = await this.prisma.buyer.findUnique({ where: { intakeToken: token }, select: { id: true } });
    if (!buyer) return { ok: false };

    if (legacyEvents[event]) {
      await this.prisma.buyerEvent.create({
        data: { buyerId: buyer.id, eventType: legacyEvents[event], metadata },
      });
    }

    if (intakeEvent) {
      await this.logIntakeEvent({
        buyerId: buyer.id,
        intakeToken: token,
        eventType: intakeEvent,
        metadata,
        source: 'legacy_track_endpoint',
      });
    }
    return { ok: true };
  }

  async getBuyerIntakeEvents(buyerId: string) {
    return this.prisma.buyerIntakeEvent.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async logIntakeEvent(input: LogIntakeEventInput) {
    const metadata = input.metadata || {};
    const source = input.source || 'api';
    const now = new Date();

    if (this.shouldDedupe(input.eventType)) {
      const duplicate = await this.prisma.buyerIntakeEvent.findFirst({
        where: {
          buyerId: input.buyerId,
          eventType: input.eventType,
          intakeToken: input.intakeToken || undefined,
          createdAt: { gte: new Date(now.getTime() - INTAKE_EVENT_DEDUPE_WINDOW_MS) },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (duplicate) return duplicate;
    }

    const eventData = {
      buyerId: input.buyerId,
      intakeToken: input.intakeToken || undefined,
      eventType: input.eventType,
      metadata,
      createdBy: input.createdBy || undefined,
      source,
    };

    const buyerUpdate = this.getBuyerUpdateForEvent(input.eventType, now, metadata);
    if (Object.keys(buyerUpdate).length === 0) {
      return this.prisma.buyerIntakeEvent.create({ data: eventData });
    }

    const [event] = await this.prisma.$transaction([
      this.prisma.buyerIntakeEvent.create({ data: eventData }),
      this.prisma.buyer.update({ where: { id: input.buyerId }, data: buyerUpdate }),
    ]);

    return event;
  }

  private shouldDedupe(eventType: BuyerIntakeEventType) {
    return eventType === BuyerIntakeEventType.INTAKE_LINK_OPENED
      || eventType === BuyerIntakeEventType.INTAKE_FORM_STARTED;
  }

  private getBuyerUpdateForEvent(eventType: BuyerIntakeEventType, now: Date, metadata: any) {
    const intakeLink = typeof metadata?.intakeLink === 'string' ? metadata.intakeLink : undefined;
    const expiresAt = metadata?.expiresAt ? new Date(metadata.expiresAt) : undefined;

    switch (eventType) {
      case BuyerIntakeEventType.INTAKE_LINK_CREATED:
        return {
          intakeStatus: BuyerIntakeStatus.LINK_CREATED,
          ...(intakeLink ? { intakeLink } : {}),
          ...(expiresAt && !Number.isNaN(expiresAt.getTime()) ? { intakeExpiresAt: expiresAt } : {}),
        };
      case BuyerIntakeEventType.INTAKE_LINK_SENT:
        return {
          intakeStatus: BuyerIntakeStatus.LINK_SENT,
          intakeSentAt: now,
          ...(intakeLink ? { intakeLink } : {}),
          ...(expiresAt && !Number.isNaN(expiresAt.getTime()) ? { intakeExpiresAt: expiresAt } : {}),
        };
      case BuyerIntakeEventType.INTAKE_LINK_OPENED:
        return { intakeStatus: BuyerIntakeStatus.OPENED, intakeOpenedAt: now };
      case BuyerIntakeEventType.INTAKE_FORM_STARTED:
        return { intakeStatus: BuyerIntakeStatus.STARTED, intakeStartedAt: now };
      case BuyerIntakeEventType.INTAKE_FORM_SUBMITTED:
        return {
          intakeStatus: BuyerIntakeStatus.SUBMITTED,
          intakeSubmittedAt: now,
          intakeCompletedAt: now,
        };
      case BuyerIntakeEventType.INTAKE_REMINDER_SENT:
        return { intakeLastReminderAt: now };
      case BuyerIntakeEventType.INTAKE_LINK_EXPIRED:
        return { intakeStatus: BuyerIntakeStatus.EXPIRED, intakeExpiresAt: now };
      case BuyerIntakeEventType.INTAKE_MANUAL_REVIEW_NEEDED:
        return { intakeStatus: BuyerIntakeStatus.MANUAL_REVIEW_NEEDED };
      default:
        return {};
    }
  }

  private mapLegacyTrackEvent(event: string): BuyerIntakeEventType | null {
    if (event === 'INTAKE_OPENED') return BuyerIntakeEventType.INTAKE_LINK_OPENED;
    if (event === 'INTAKE_STEP_2') return BuyerIntakeEventType.INTAKE_FORM_STARTED;
    if (event === 'INTAKE_COMPLETED') return BuyerIntakeEventType.INTAKE_FORM_SUBMITTED;
    return null;
  }
}
