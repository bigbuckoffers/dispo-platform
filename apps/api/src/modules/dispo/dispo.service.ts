import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import twilio from 'twilio';
import * as sgMail from '@sendgrid/mail';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AiWriterService } from '../ai/ai-writer.service';
import { BuyerTier, CampaignChannel } from '@prisma/client';

@Injectable()
export class DispoService {
  private readonly logger = new Logger(DispoService.name);
  private twilioClient: twilio.Twilio;

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

  /**
   * Triggered when a deal is released to a tier.
   * Automatically creates and sends a campaign to the matched buyers in that tier.
   */
  @OnEvent('deal.released')
  async onDealReleased(payload: { dealId: string; orgId: string; tier: number; userId: string }) {
    const { dealId, orgId, tier } = payload;
    this.logger.log(`Deal ${dealId} released to tier ${tier} — creating campaign`);

    const tierEnum = tier === 1 ? BuyerTier.TIER_1 : tier === 2 ? BuyerTier.TIER_2 : BuyerTier.TIER_3;

    const [deal, matchedBuyers] = await Promise.all([
      this.prisma.deal.findUnique({ where: { id: dealId } }),
      this.prisma.matchResult.findMany({
        where: { dealId },
        orderBy: { rank: 'asc' },
        take: 100,
        include: {
          buyer: {
            where: { tier: tierEnum },
            include: { buyBox: true },
          },
        },
      }),
    ]);

    if (!deal) return;

    // Filter to buyers in the target tier
    const tierBuyers = matchedBuyers.filter(m => m.buyer);

    if (tierBuyers.length === 0) {
      this.logger.warn(`No buyers in tier ${tier} matched for deal ${dealId}`);
      return;
    }

    // Generate AI campaign content
    const content = await this.aiWriter.generateCampaignSequence(deal, `Tier ${tier}`);

    // Create campaign record
    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId: orgId,
        dealId,
        name: `Tier ${tier} — ${deal.address} — ${new Date().toLocaleDateString()}`,
        channel: CampaignChannel.BOTH,
        targetTier: tierEnum,
        subject: content.email_subject,
        body: content.email_body,
        totalRecipients: tierBuyers.length,
        status: 'SENDING',
      },
    });

    // Queue personalized sends
    for (const match of tierBuyers) {
      const buyer = match.buyer;
      if (!buyer) continue;

      await this.dispoQueue.add('send-sms', {
        campaignId: campaign.id,
        buyerId: buyer.id,
        to: buyer.phone,
        body: content.sms1,
      }, { delay: Math.random() * 30000 }); // stagger by up to 30s

      if (buyer.email) {
        await this.dispoQueue.add('send-email', {
          campaignId: campaign.id,
          buyerId: buyer.id,
          to: buyer.email,
          subject: content.email_subject,
          html: this.formatEmailHtml(content.email_body, deal, buyer),
        }, { delay: Math.random() * 60000 });
      }
    }

    this.logger.log(`Campaign ${campaign.id} queued for ${tierBuyers.length} buyers`);
  }

  async sendSms(to: string, body: string, campaignId: string): Promise<string> {
    const message = await this.twilioClient.messages.create({
      body,
      to,
      from: this.config.get('TWILIO_PHONE_NUMBER'),
      statusCallback: `${this.config.get('API_BASE_URL')}/api/v1/webhooks/twilio`,
    });
    return message.sid;
  }

  async sendEmail(to: string, subject: string, html: string, campaignId: string): Promise<void> {
    await sgMail.send({
      to,
      from: {
        email: this.config.get('SENDGRID_FROM_EMAIL') ?? 'deals@yourdomain.com',
        name: this.config.get('SENDGRID_FROM_NAME') ?? 'Your Dispo Team',
      },
      subject,
      html,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
      customArgs: { campaign_id: campaignId },
    });
  }

  async getCampaignStats(campaignId: string) {
    return this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: { select: { recipients: true, messages: true } },
      },
    });
  }

  async getOrgCampaigns(orgId: string, dealId?: string) {
    return this.prisma.campaign.findMany({
      where: { organizationId: orgId, ...(dealId && { dealId }) },
      orderBy: { createdAt: 'desc' },
      include: {
        deal: { select: { address: true, city: true, state: true } },
        _count: { select: { recipients: true, messages: true } },
      },
    });
  }

  async handleTwilioWebhook(data: any) {
    const { MessageSid, MessageStatus } = data;
    if (!MessageSid) return;

    const statusMap: Record<string, any> = {
      delivered: { deliveredAt: new Date() },
      read: { openedAt: new Date() },
      failed: { status: 'FAILED', errorMsg: data.ErrorMessage },
      undelivered: { status: 'BOUNCED' },
    };

    const update = statusMap[MessageStatus];
    if (update) {
      await this.prisma.message.updateMany({
        where: { externalId: MessageSid },
        data: update,
      });
    }
  }

  private formatEmailHtml(body: string, deal: any, buyer: any): string {
    return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">New Deal Alert: ${deal.address}</h2>
  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <p><strong>Asking:</strong> $${deal.askingPrice?.toLocaleString()}</p>
    <p><strong>ARV:</strong> $${deal.arv?.toLocaleString() ?? 'TBD'}</p>
    <p><strong>Repairs:</strong> $${deal.repairEstimate?.toLocaleString() ?? 'TBD'}</p>
    <p><strong>Specs:</strong> ${deal.beds}bd/${deal.baths}ba | ${deal.sqft?.toLocaleString() ?? '?'} sqft</p>
  </div>
  <div style="white-space: pre-line; margin: 15px 0;">${body}</div>
  <a href="${this.config.get('WEB_BASE_URL')}/deals/${deal.id}"
     style="background: #000; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 10px;">
    View Deal →
  </a>
  <p style="color: #999; font-size: 12px; margin-top: 30px;">
    You're receiving this because you're on our buyer list. 
    <a href="${this.config.get('WEB_BASE_URL')}/unsubscribe?id=${buyer.id}">Unsubscribe</a>
  </p>
</body>
</html>`;
  }
}
