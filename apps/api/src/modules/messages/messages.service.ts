import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as twilio from 'twilio';
import { randomBytes } from 'crypto';
import { IntakeService } from '../intake/intake.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);
  private twilioClient: any;

  constructor(private prisma: PrismaService, private config: ConfigService, private intakeService: IntakeService) {
    this.twilioClient = twilio(
      config.get('TWILIO_ACCOUNT_SID'),
      config.get('TWILIO_AUTH_TOKEN'),
    );
  }

  async getConversations(orgId: string) {
    return this.prisma.conversation.findMany({
      where: { organizationId: orgId },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true, phone: true, tier: true } },
      },
    });
  }

  async getMessages(orgId: string, buyerId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { organizationId_buyerId: { organizationId: orgId, buyerId } },
      include: { smsMessages: { orderBy: { createdAt: 'asc' } } },
    });
    if (conv) {
      await this.prisma.conversation.update({
        where: { id: conv.id }, data: { unreadCount: 0 },
      });
    }
    return conv;
  }

  async sendMessage(orgId: string, buyerId: string, body: string, options: { intakeTrackingType?: 'link_sent' | 'reminder'; trackingMetadata?: any } = {}) {
    const buyer = await this.prisma.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer?.phone) throw new Error('Buyer has no phone number');
    const twilioSid = await this.sendViaTwilio(buyer.phone, body);
    const conv = await this.prisma.conversation.upsert({
      where: { organizationId_buyerId: { organizationId: orgId, buyerId } },
      create: { organizationId: orgId, buyerId, lastMessageAt: new Date(), lastMessageBody: body },
      update: { lastMessageAt: new Date(), lastMessageBody: body },
    });
    const message = await this.prisma.smsMessage.create({
      data: {
        conversationId: conv.id, body, direction: 'OUTBOUND', status: 'SENT',
        twilioSid, fromNumber: this.config.get('TWILIO_PHONE_NUMBER'), toNumber: buyer.phone,
      },
    });

    try {
      await this.intakeService.logMessagingIntakeEventFromMessage({
        buyerId,
        messageBody: body,
        intakeTrackingType: options.intakeTrackingType || 'link_sent',
        metadata: {
          source: options.trackingMetadata?.source || 'dispoai_messaging',
          method: 'twilio_sms',
          messageId: message.id,
          twilioSid,
          conversationId: conv.id,
          buyerId,
          ...(options.trackingMetadata || {}),
        },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to log intake tracking for message ${message.id}: ${e.message}`);
    }

    return message;
  }

  async handleInbound(data: any) {
    this.logger.log(`Inbound webhook data: ${JSON.stringify(data)}`);
    const { Body, From, To, MessageSid } = data;
    if (!Body || !From) return { success: false };
    try {
    const phone = From.replace(/\s/g, '');
    // Normalize: try exact match first, then strip +1, then add +1
    const phoneVariants = [phone, phone.replace(/^\+1/, ''), phone.startsWith('+1') ? phone : '+1'+phone.replace(/^\+/, '')];
    let buyer = null;
    for (const p of phoneVariants) {
      buyer = await this.prisma.buyer.findFirst({ where: { phone: p } });
      if (buyer) break;
    }
    let buyerId: string;
    let orgId: string;
    if (buyer) {
      buyerId = buyer.id; orgId = buyer.organizationId;
    } else {
      const org = await this.prisma.organization.findFirst();
      if (!org) return { success: false };
      orgId = org.id;
      const newBuyer = await this.prisma.buyer.create({
        data: { organizationId: orgId, phone, firstName: 'Unknown', lastName: 'Lead', email: `sms-lead-${phone.replace(/[^0-9]/g,'')}@import.dispoai.com` } as any,
      });
      buyerId = newBuyer.id;
    }
    const conv = await this.prisma.conversation.upsert({
      where: { organizationId_buyerId: { organizationId: orgId, buyerId } },
      create: { organizationId: orgId, buyerId, lastMessageAt: new Date(), lastMessageBody: Body, unreadCount: 1 },
      update: { lastMessageAt: new Date(), lastMessageBody: Body, unreadCount: { increment: 1 } },
    });
    await this.prisma.smsMessage.create({
      data: { conversationId: conv.id, body: Body, direction: 'INBOUND', status: 'DELIVERED', twilioSid: MessageSid, fromNumber: From, toNumber: To },
    });
    this.logger.log(`Inbound SMS from ${From}: ${Body}`);
    return { success: true };
    } catch (e) {
      this.logger.error(`Inbound webhook error: ${e.message}`, e.stack);
      throw e;
    }
  }

  private buildBuyBoxBulkMessage(templateKey: string, link: string, customMessage?: string) {
    const templates: Record<string, string> = {
      general: `Hey, can you complete your Buy Box form so we can send you deals that actually match what you buy? ${link}`,
      new_number: `Hey, this is DispoAI / Big Buck Offers. You may not have this number saved yet — can you complete your Buy Box form so we know what deals to send you? ${link}`,
      long_time: `Hey, it’s been a while. We’re cleaning up our buyer list and only want to send deals that fit. Can you update your Buy Box here? ${link}`,
      cold_data: `Hey, we’re updating our buyer network and wanted to confirm what types of deals you’re looking for. Fill out your Buy Box here and we’ll only send relevant opportunities: ${link}`,
      vip: `Hey, we’re updating our VIP buyer profiles so we can keep sending you the right deals first. Can you confirm your current Buy Box here? ${link}`,
    };

    const base = (customMessage || '').trim() || templates[templateKey] || templates.general;
    return base.includes('{{link}}') ? base.replaceAll('{{link}}', link) : base.includes(link) ? base : `${base} ${link}`;
  }

  private async getOrCreateBuyerBuyBoxLink(buyer: any) {
    if (buyer.intakeToken) {
      return `https://dispo-platform-web.vercel.app/intake/${buyer.intakeToken}`;
    }

    const token = randomBytes(24).toString('hex');

    await this.prisma.buyer.update({
      where: { id: buyer.id },
      data: {
        intakeToken: token,
        intakeStatus: 'LINK_CREATED' as any,
      } as any,
    });

    return `https://dispo-platform-web.vercel.app/intake/${token}`;
  }

  async sendBulkBuyBox(
    orgId: string,
    buyerIds: string[],
    options: {
      templateKey?: string;
      customMessage?: string;
      includeAlreadySent?: boolean;
      delayMs?: number;
    } = {},
  ) {
    const delayMs = options.delayMs || 12000;
    const batchId = `buybox-${Date.now()}`;

    const buyers = await this.prisma.buyer.findMany({
      where: { id: { in: buyerIds } },
    });

    const buyerById = new Map(buyers.map((b: any) => [b.id, b]));
    const eligible: any[] = [];
    const skipped: { buyerId: string; reason: string }[] = [];

    for (const buyerId of buyerIds) {
      const buyer: any = buyerById.get(buyerId);
      if (!buyer) {
        skipped.push({ buyerId, reason: 'buyer_not_found' });
        continue;
      }

      if (!buyer.phone) {
        skipped.push({ buyerId, reason: 'missing_phone' });
        continue;
      }

      if (buyer.intakeSubmittedAt || buyer.intakeStatus === 'SUBMITTED') {
        skipped.push({ buyerId, reason: 'already_submitted' });
        continue;
      }

      const alreadySent = !!buyer.intakeSentAt || ['LINK_SENT', 'OPENED', 'STARTED'].includes(buyer.intakeStatus);
      if (alreadySent && !options.includeAlreadySent) {
        skipped.push({ buyerId, reason: 'already_sent' });
        continue;
      }

      eligible.push(buyer);
    }

    eligible.forEach((buyer: any, index: number) => {
      setTimeout(async () => {
        try {
          const link = await this.getOrCreateBuyerBuyBoxLink(buyer);
          const message = this.buildBuyBoxBulkMessage(options.templateKey || 'general', link, options.customMessage);

          await this.sendMessage(orgId, buyer.id, message, {
            intakeTrackingType: 'link_sent',
            trackingMetadata: {
              source: 'bulk_buy_box_send',
              method: 'twilio_sms',
              batchId,
              templateKey: options.templateKey || 'general',
              dripRate: '5_per_minute',
              delayMs,
            },
          });

          this.logger.log(`Bulk Buy Box sent to buyer ${buyer.id} in batch ${batchId}`);
        } catch (e: any) {
          this.logger.error(`Bulk Buy Box failed for buyer ${buyer.id} in batch ${batchId}: ${e.message}`);
        }
      }, index * delayMs);
    });

    return {
      batchId,
      selected: buyerIds.length,
      queued: eligible.length,
      skipped: skipped.length,
      skippedDetails: skipped,
      dripRate: '5 texts per minute',
      delayMs,
      estimatedMinutes: Math.max(1, Math.ceil(eligible.length / 5)),
    };
  }

  async sendBulk(orgId: string, buyerIds: string[], body: string, delayMs: number = 12000, options: { intakeTrackingType?: 'link_sent' | 'reminder'; batchId?: string } = {}) {
    for (let i = 0; i < buyerIds.length; i++) {
      setTimeout(async () => {
        try { await this.sendMessage(orgId, buyerIds[i], body, { intakeTrackingType: options.intakeTrackingType || 'link_sent', trackingMetadata: { source: 'bulk_intake_send', batchId: options.batchId || `bulk-${Date.now()}` } }); }
        catch (e) { this.logger.error(`Failed to send to ${buyerIds[i]}: ${e.message}`); }
      }, i * delayMs);
    }
    return { queued: buyerIds.length, estimatedMinutes: Math.ceil((buyerIds.length * delayMs) / 60000) };
  }

  private async sendViaTwilio(to: string, body: string): Promise<string> {
    const msg = await this.twilioClient.messages.create({
      body, to, from: this.config.get('TWILIO_PHONE_NUMBER'),
    });
    return msg.sid;
  }
}
// force Thu May 28 19:45:41 UTC 2026
