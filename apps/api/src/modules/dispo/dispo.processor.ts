import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DispoService } from './dispo.service';
import { IntakeService } from '../intake/intake.service';

@Processor('dispo')
export class DispoProcessor {
  private readonly logger = new Logger(DispoProcessor.name);

  constructor(
    private dispoService: DispoService,
    private prisma: PrismaService,
    private intakeService: IntakeService,
  ) {}

  @Process('send-sms')
  async handleSendSms(job: Job<{
    campaignId: string; buyerId: string; to: string; body: string; intakeTrackingType?: 'link_sent' | 'reminder';
  }>) {
    const { campaignId, buyerId, to, body, intakeTrackingType } = job.data;
    if (!to) return;

    try {
      const sid = await this.dispoService.sendSms(to, body, campaignId);

      // Record message
      const message = await this.prisma.message.create({
        data: {
          campaignId,
          channel: 'SMS',
          toAddress: to,
          body,
          externalId: sid,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      try {
        await this.intakeService.logMessagingIntakeEventFromMessage({
          buyerId,
          messageBody: body,
          intakeTrackingType: intakeTrackingType || 'link_sent',
          metadata: {
            source: 'queued_dispo_campaign',
            method: 'queued_sms',
            messageId: message.id,
            campaignId,
            externalId: sid,
            buyerId,
          },
        });
      } catch (e: any) {
        this.logger.warn(`Failed to log queued SMS intake tracking for buyer ${buyerId}: ${e.message}`);
      }

      // Increment campaign delivered count
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { delivered: { increment: 1 } },
      });
    } catch (err) {
      this.logger.error(`SMS send failed for ${to}: ${err.message}`);
      throw err; // Bull will retry
    }
  }

  @Process('send-email')
  async handleSendEmail(job: Job<{
    campaignId: string; buyerId: string; to: string; subject: string; html: string; intakeTrackingType?: 'link_sent' | 'reminder';
  }>) {
    const { campaignId, buyerId, to, subject, html, intakeTrackingType } = job.data;
    if (!to) return;

    try {
      await this.dispoService.sendEmail(to, subject, html, campaignId);

      const message = await this.prisma.message.create({
        data: {
          campaignId,
          channel: 'EMAIL',
          toAddress: to,
          body: html,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      try {
        await this.intakeService.logMessagingIntakeEventFromMessage({
          buyerId,
          messageBody: html,
          intakeTrackingType: intakeTrackingType || 'link_sent',
          metadata: {
            source: 'queued_dispo_campaign',
            method: 'queued_email',
            messageId: message.id,
            campaignId,
            buyerId,
          },
        });
      } catch (e: any) {
        this.logger.warn(`Failed to log queued email intake tracking for buyer ${buyerId}: ${e.message}`);
      }

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { delivered: { increment: 1 } },
      });
    } catch (err) {
      this.logger.error(`Email send failed for ${to}: ${err.message}`);
      throw err;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Dispo job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${err.message}`);
  }
}
