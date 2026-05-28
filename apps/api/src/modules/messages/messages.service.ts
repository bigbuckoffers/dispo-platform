import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as twilio from 'twilio';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);
  private twilioClient: any;

  constructor(private prisma: PrismaService, private config: ConfigService) {
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

  async sendMessage(orgId: string, buyerId: string, body: string) {
    const buyer = await this.prisma.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer?.phone) throw new Error('Buyer has no phone number');
    const twilioSid = await this.sendViaTwilio(buyer.phone, body);
    const conv = await this.prisma.conversation.upsert({
      where: { organizationId_buyerId: { organizationId: orgId, buyerId } },
      create: { organizationId: orgId, buyerId, lastMessageAt: new Date(), lastMessageBody: body },
      update: { lastMessageAt: new Date(), lastMessageBody: body },
    });
    return this.prisma.smsMessage.create({
      data: {
        conversationId: conv.id, body, direction: 'OUTBOUND', status: 'SENT',
        twilioSid, fromNumber: this.config.get('TWILIO_PHONE_NUMBER'), toNumber: buyer.phone,
      },
    });
  }

  async handleInbound(data: any) {
    const { Body, From, To, MessageSid } = data;
    if (!Body || !From) return { success: false };
    const phone = From.replace(/\s/g, '');
    const buyer = await this.prisma.buyer.findFirst({ where: { phone } });
    let buyerId: string;
    let orgId: string;
    if (buyer) {
      buyerId = buyer.id; orgId = buyer.organizationId;
    } else {
      const org = await this.prisma.organization.findFirst();
      if (!org) return { success: false };
      orgId = org.id;
      const newBuyer = await this.prisma.buyer.create({
        data: { organizationId: orgId, phone, firstName: 'Unknown', lastName: 'Lead', importSource: 'SMS_INBOUND' },
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
  }

  async sendBulk(orgId: string, buyerIds: string[], body: string, delayMs: number = 12000) {
    for (let i = 0; i < buyerIds.length; i++) {
      setTimeout(async () => {
        try { await this.sendMessage(orgId, buyerIds[i], body); }
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
