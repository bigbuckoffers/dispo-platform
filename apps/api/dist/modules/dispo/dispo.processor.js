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
var DispoProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispoProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const dispo_service_1 = require("./dispo.service");
let DispoProcessor = DispoProcessor_1 = class DispoProcessor {
    constructor(dispoService, prisma) {
        this.dispoService = dispoService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(DispoProcessor_1.name);
    }
    async handleSendSms(job) {
        const { campaignId, to, body } = job.data;
        if (!to)
            return;
        try {
            const sid = await this.dispoService.sendSms(to, body, campaignId);
            await this.prisma.message.create({
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
            await this.prisma.campaign.update({
                where: { id: campaignId },
                data: { delivered: { increment: 1 } },
            });
        }
        catch (err) {
            this.logger.error(`SMS send failed for ${to}: ${err.message}`);
            throw err;
        }
    }
    async handleSendEmail(job) {
        const { campaignId, to, subject, html } = job.data;
        if (!to)
            return;
        try {
            await this.dispoService.sendEmail(to, subject, html, campaignId);
            await this.prisma.message.create({
                data: {
                    campaignId,
                    channel: 'EMAIL',
                    toAddress: to,
                    body: html,
                    status: 'SENT',
                    sentAt: new Date(),
                },
            });
            await this.prisma.campaign.update({
                where: { id: campaignId },
                data: { delivered: { increment: 1 } },
            });
        }
        catch (err) {
            this.logger.error(`Email send failed for ${to}: ${err.message}`);
            throw err;
        }
    }
    onFailed(job, err) {
        this.logger.error(`Dispo job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${err.message}`);
    }
};
exports.DispoProcessor = DispoProcessor;
__decorate([
    (0, bull_1.Process)('send-sms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DispoProcessor.prototype, "handleSendSms", null);
__decorate([
    (0, bull_1.Process)('send-email'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DispoProcessor.prototype, "handleSendEmail", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], DispoProcessor.prototype, "onFailed", null);
exports.DispoProcessor = DispoProcessor = DispoProcessor_1 = __decorate([
    (0, bull_1.Processor)('dispo'),
    __metadata("design:paramtypes", [dispo_service_1.DispoService,
        prisma_service_1.PrismaService])
], DispoProcessor);
//# sourceMappingURL=dispo.processor.js.map