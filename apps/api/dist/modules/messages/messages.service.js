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
var MessagesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const twilio = require("twilio");
let MessagesService = MessagesService_1 = class MessagesService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(MessagesService_1.name);
        this.twilioClient = twilio(config.get('TWILIO_ACCOUNT_SID'), config.get('TWILIO_AUTH_TOKEN'));
    }
    async getConversations(orgId) {
        return this.prisma.conversation.findMany({
            where: { organizationId: orgId },
            orderBy: { lastMessageAt: 'desc' },
            include: {
                buyer: { select: { id: true, firstName: true, lastName: true, phone: true, tier: true } },
            },
        });
    }
    async getMessages(orgId, buyerId) {
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
    async sendMessage(orgId, buyerId, body) {
        const buyer = await this.prisma.buyer.findUnique({ where: { id: buyerId } });
        if (!buyer?.phone)
            throw new Error('Buyer has no phone number');
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
    async handleInbound(data) {
        this.logger.log(`Inbound webhook data: ${JSON.stringify(data)}`);
        const { Body, From, To, MessageSid } = data;
        if (!Body || !From)
            return { success: false };
        try {
            const phone = From.replace(/\s/g, '');
            const phoneVariants = [phone, phone.replace(/^\+1/, ''), phone.startsWith('+1') ? phone : '+1' + phone.replace(/^\+/, '')];
            let buyer = null;
            for (const p of phoneVariants) {
                buyer = await this.prisma.buyer.findFirst({ where: { phone: p } });
                if (buyer)
                    break;
            }
            let buyerId;
            let orgId;
            if (buyer) {
                buyerId = buyer.id;
                orgId = buyer.organizationId;
            }
            else {
                const org = await this.prisma.organization.findFirst();
                if (!org)
                    return { success: false };
                orgId = org.id;
                const newBuyer = await this.prisma.buyer.create({
                    data: { organizationId: orgId, phone, firstName: 'Unknown', lastName: 'Lead', email: `sms-lead-${phone.replace(/[^0-9]/g, '')}@import.dispoai.com` },
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
        catch (e) {
            this.logger.error(`Inbound webhook error: ${e.message}`, e.stack);
            throw e;
        }
    }
    async sendBulk(orgId, buyerIds, body, delayMs = 12000) {
        for (let i = 0; i < buyerIds.length; i++) {
            setTimeout(async () => {
                try {
                    await this.sendMessage(orgId, buyerIds[i], body);
                }
                catch (e) {
                    this.logger.error(`Failed to send to ${buyerIds[i]}: ${e.message}`);
                }
            }, i * delayMs);
        }
        return { queued: buyerIds.length, estimatedMinutes: Math.ceil((buyerIds.length * delayMs) / 60000) };
    }
    async sendViaTwilio(to, body) {
        const msg = await this.twilioClient.messages.create({
            body, to, from: this.config.get('TWILIO_PHONE_NUMBER'),
        });
        return msg.sid;
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = MessagesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map