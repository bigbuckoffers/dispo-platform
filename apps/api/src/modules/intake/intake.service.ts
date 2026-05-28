import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class IntakeService {
  constructor(private prisma: PrismaService) {}

  async generateToken(buyerId: string): Promise<string> {
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

    await this.prisma.buyerIntakeSubmission.create({
      data: {
        buyerId: buyer.id,
        status: 'PENDING',
        submittedData: data,
      },
    });

    await this.prisma.buyer.update({
      where: { id: buyer.id },
      data: { intakeSubmittedAt: new Date() },
    });

    return { success: true, message: 'Buy box submitted successfully' };
  }

  async getPendingSubmissions(orgId: string) {
    return this.prisma.buyerIntakeSubmission.findMany({
      where: { status: 'PENDING', buyer: { organizationId: orgId } },
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
