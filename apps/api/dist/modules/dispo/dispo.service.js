"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DispoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispoService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
const bull_1 = require("@nestjs/bull");
const twilio = require("twilio");
const sgMail = require("@sendgrid/mail");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const ai_writer_service_1 = require("../ai/ai-writer.service");
let DispoService = DispoService_1 = class DispoService {
    constructor(prisma, config, aiWriter, dispoQueue) {
        this.prisma = prisma;
        this.config = config;
        this.aiWriter = aiWriter;
        this.dispoQueue = dispoQueue;
        this.logger = new common_1.Logger(DispoService_1.name);
        this.twilioClient = twilio(config.get('TWILIO_ACCOUNT_SID'), config.get('TWILIO_AUTH_TOKEN'));
        sgMail.setApiKey(config.get('SENDGRID_API_KEY') ?? '');
    }
    async onDealReleased(payload) {
        const { dealId, orgId, tier } = payload;
        this.logger.log(`Deal ${dealId} released to tier ${tier}`);
        const tierMap = { 1: 'TIER_1', 2: 'TIER_2', 3: 'TIER_3' };
        const tierEnum = tierMap[tier];
        const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
        if (!deal)
            return;
        const matchedBuyers = await this.prisma.matchResult.findMany({
            where: { dealId },
            orderBy: { rank: 'asc' },
            take: 100,
        });
        const buyerIds = matchedBuyers.map(m => m.buyerId);
        const buyers = await this.prisma.buyer.findMany({
            where: { id: { in: buyerIds }, tier: tierEnum, isActive: true },
        });
        if (buyers.length === 0)
            return;
        const content = await this.aiWriter.generateCampaignSequence(deal, `Tier ${tier}`);
        const campaign = await this.prisma.campaign.create({
            data: {
                organizationId: orgId,
                dealId,
                name: `Tier ${tier} — ${deal.address} — ${new Date().toLocaleDateString()}`,
                channel: 'BOTH',
                targetTier: tierEnum,
                subject: content.email_subject,
                body: content.email_body,
                totalRecipients: buyers.length,
                status: 'SENDING',
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
    async sendSms(to, body, campaignId) {
        const message = await this.twilioClient.messages.create({
            body, to, from: this.config.get('TWILIO_PHONE_NUMBER'),
        });
        return message.sid;
    }
    async sendEmail(to, subject, html, campaignId) {
        await sgMail.send({
            to,
            from: { email: this.config.get('SENDGRID_FROM_EMAIL') ?? 'deals@yourdomain.com', name: 'Dispo Team' },
            subject, html,
            customArgs: { campaign_id: campaignId },
        });
    }
    async getCampaignStats(campaignId) {
        return this.prisma.campaign.findUnique({ where: { id: campaignId } });
    }
    async getOrgCampaigns(orgId, dealId) {
        return this.prisma.campaign.findMany({
            where: { organizationId: orgId, ...(dealId && { dealId }) },
            orderBy: { createdAt: 'desc' },
        });
    }
    async handleTwilioWebhook(data) {
        const { MessageSid, MessageStatus } = data;
        if (!MessageSid)
            return;
        if (MessageStatus === 'delivered') {
            await this.prisma.message.updateMany({
                where: { externalId: MessageSid }, data: { deliveredAt: new Date() },
            });
        }
    }
    formatEmailHtml(body, deal, buyer) {
        return `<html><body style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px">
      <h2>New Deal: ${deal.address}</h2>
      <p>Asking: $${deal.askingPrice?.toLocaleString()} | ARV: $${deal.arv?.toLocaleString() ?? 'TBD'}</p>
      <div>${body}</div>
      <a href="${this.config.get('WEB_BASE_URL')}/deals/${deal.id}" style="background:#000;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:10px">View Deal →</a>
    </body></html>`;
    }
};
exports.DispoService = DispoService;
__decorate([
    (0, event_emitter_1.OnEvent)('deal.released'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DispoService.prototype, "onDealReleased", null);
exports.DispoService = DispoService = DispoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, bull_1.InjectQueue)('dispo')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        ai_writer_service_1.AiWriterService, Object])
], DispoService);
//# sourceMappingURL=dispo.service.js.map