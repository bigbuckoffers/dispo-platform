import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as twilio from 'twilio';
import * as sgMail from '@sendgrid/mail';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AiWriterService } from '../ai/ai-writer.service';

@Injectable()
export class DispoService {
  private readonly logger = new Logger(DispoService.name);
  private twilioClient: any;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private aiWriter: AiWriterService,
    @InjectQueue('dispo') private dispoQueue: Queue,
  ) {
    this.twilioClient = twilio(
      config.get('TWILIO_ACCOUNT_SID'),
      config.get('TWILIO_AUTH_TOKEN'),
    );
    sgMail.setApiKey(config.get('SENDGRID_API_KEY') ?? '');
  }

  @OnEvent('deal.released')
  async onDealReleased(payload: { dealId: string; orgId: string; tier: number; userId: string }) {
    const { dealId, orgId, tier } = payload;
    this.logger.log(`Deal ${dealId} released to tier ${tier}`);

    const tierMap: any = { 1: 'TIER_1', 2: 'TIER_2', 3: 'TIER_3' };
    const tierEnum = tierMap[tier];

    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) return;

    const matchedBuyers = await this.prisma.matchResult.findMany({
      where: { dealId },
      orderBy: { rank: 'asc' },
      take: 100,
    });

    const buyerIds = matchedBuyers.map(m => m.buyerId);
    const buyers = await this.prisma.buyer.findMany({
      where: { id: { in: buyerIds }, tier: tierEnum, isActive: true },
    });

    if (buyers.length === 0) return;

    const content = await this.aiWriter.generateCampaignSequence(deal, `Tier ${tier}`);

    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId: orgId,
        dealId,
        name: `Tier ${tier} — ${deal.address} — ${new Date().toLocaleDateString()}`,
        channel: 'BOTH' as any,
        targetTier: tierEnum,
        subject: content.email_subject,
        body: content.email_body,
        totalRecipients: buyers.length,
        status: 'SENDING' as any,
      },
    });

    for (const buyer of buyers) {
      if (buyer.phone) {
        await this.dispoQueue.add('send-sms', {
          campaignId: campaign.id, buyerId: buyer.id,
          to: buyer.phone, body: content.sms1,
        }, { delay: Math.random() * 30000 });
      }
      if (buyer.email) {
        await this.dispoQueue.add('send-email', {
          campaignId: campaign.id, buyerId: buyer.id,
          to: buyer.email, subject: content.email_subject,
          html: this.formatEmailHtml(content.email_body, deal, buyer),
        }, { delay: Math.random() * 60000 });
      }
    }
  }

  async sendSms(to: string, body: string, campaignId: string): Promise<string> {
    const message = await this.twilioClient.messages.create({
      body, to, from: this.config.get('TWILIO_PHONE_NUMBER'),
    });
    return message.sid;
  }

  async sendEmail(to: string, subject: string, html: string, campaignId: string): Promise<void> {
    await sgMail.send({
      to,
      from: { email: this.config.get('SENDGRID_FROM_EMAIL') ?? 'deals@yourdomain.com', name: 'Dispo Team' },
      subject, html,
      customArgs: { campaign_id: campaignId },
    });
  }

  async getCampaignStats(campaignId: string) {
    return this.prisma.campaign.findUnique({ where: { id: campaignId } });
  }

  async getOrgCampaigns(orgId: string, dealId?: string) {
    return this.prisma.campaign.findMany({
      where: { organizationId: orgId, ...(dealId && { dealId }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async handleTwilioWebhook(data: any) {
    const { MessageSid, MessageStatus } = data;
    if (!MessageSid) return;
    if (MessageStatus === 'delivered') {
      await this.prisma.message.updateMany({
        where: { externalId: MessageSid }, data: { deliveredAt: new Date() },
      });
    }
  }

  private formatEmailHtml(body: string, deal: any, buyer: any): string {
    return `<html><body style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px">
      <h2>New Deal: ${deal.address}</h2>
      <p>Asking: $${deal.askingPrice?.toLocaleString()} | ARV: $${deal.arv?.toLocaleString() ?? 'TBD'}</p>
      <div>${body}</div>
      <a href="${this.config.get('WEB_BASE_URL')}/deals/${deal.id}" style="background:#000;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:10px">View Deal →</a>
    </body></html>`;
  }
}
