import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

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

  async submitIntake(token: string, data: any) {
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
    await this.prisma.buyer.update({
      where: { id: buyer.id },
      data: { intakeSubmittedAt: new Date() },
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
      await this.prisma.buyer.update({
        where: { id: sub.buyerId },
        data: buyerFields,
      });
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
      select: { id: true, phone: true },
    });
    const results = [];
    for (const buyer of buyers) {
      const token = crypto.randomBytes(16).toString('hex');
      await this.prisma.buyer.update({ where: { id: buyer.id }, data: { intakeToken: token } });
      results.push({ buyerId: buyer.id, token, phone: buyer.phone });
    }
    return results;
  }
}
