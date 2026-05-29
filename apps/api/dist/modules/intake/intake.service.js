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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntakeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const crypto = require("crypto");
const notifications_service_1 = require("../notifications/notifications.service");
const client_1 = require("@prisma/client");
let IntakeService = class IntakeService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async generateToken(buyerId) {
        const existing = await this.prisma.buyer.findUnique({
            where: { id: buyerId },
            select: { intakeToken: true },
        });
        if (existing?.intakeToken)
            return existing.intakeToken;
        const token = crypto.randomBytes(16).toString('hex');
        await this.prisma.buyer.update({
            where: { id: buyerId },
            data: { intakeToken: token },
        });
        return token;
    }
    async getBuyerByToken(token) {
        const buyer = await this.prisma.buyer.findUnique({
            where: { intakeToken: token },
            include: { buyBox: true },
        });
        if (!buyer)
            throw new common_1.NotFoundException('Invalid or expired link');
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
    async submitIntake(token, data) {
        const buyer = await this.prisma.buyer.findUnique({ where: { intakeToken: token } });
        if (!buyer)
            throw new common_1.NotFoundException('Invalid or expired link');
        const isComplete = !data._partial;
        const status = isComplete ? 'SUBMITTED' : 'IN_PROGRESS';
        const existing = await this.prisma.buyerIntakeSubmission.findFirst({
            where: { buyerId: buyer.id, status: { in: ['IN_PROGRESS', 'PENDING'] } },
            orderBy: { createdAt: 'desc' },
        });
        if (existing) {
            await this.prisma.buyerIntakeSubmission.update({
                where: { id: existing.id },
                data: { submittedData: data, status },
            });
        }
        else {
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
                    await this.notifications.create(userId, client_1.NotificationType.SYSTEM, '📬 New Buy Box Submission', `${buyerName} just submitted their buy box`, '/dashboard/buyers?tab=submissions');
                }
            }
            catch { }
        }
        return { success: true, message: 'Buy box submitted successfully' };
    }
    async getPendingSubmissions(orgId) {
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
    async approveSubmission(submissionId, approvedFields) {
        const sub = await this.prisma.buyerIntakeSubmission.findUnique({
            where: { id: submissionId }, include: { buyer: true },
        });
        if (!sub)
            throw new common_1.NotFoundException('Submission not found');
        const { buyBoxFields, buyerFields } = approvedFields;
        if (buyerFields && Object.keys(buyerFields).length > 0) {
            const tempNoteFields = ['buyingStatus', 'monthlyCapacity', 'occupancy', 'hoaOk', 'minArv', 'minProfit',
                'maxRehab', 'minCashFlow', 'hardNoCriteria', 'maxEmd', 'inspectionDays', 'preferredContact',
                'dealSendFreq', 'excludedAreas', 'privateNotes', 'propertyTypes', 'minYearBuilt', 'maxYearBuilt'];
            const directFields = {};
            const statusFields = {};
            for (const [k, v] of Object.entries(buyerFields)) {
                if (tempNoteFields.includes(k)) {
                    statusFields[k] = v;
                }
                else {
                    directFields[k] = v;
                }
            }
            if (Object.keys(directFields).length > 0) {
                await this.prisma.buyer.update({ where: { id: sub.buyerId }, data: directFields });
            }
            if (Object.keys(statusFields).length > 0) {
                let existing = {};
                try {
                    if (sub.buyer.temperatureNotes)
                        existing = JSON.parse(sub.buyer.temperatureNotes);
                }
                catch { }
                const merged = { ...existing, ...statusFields };
                await this.prisma.buyer.update({ where: { id: sub.buyerId }, data: { temperatureNotes: JSON.stringify(merged) } });
            }
        }
        const submittedData = sub.submittedData;
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
    async rejectSubmission(submissionId) {
        await this.prisma.buyerIntakeSubmission.update({
            where: { id: submissionId },
            data: { status: 'REJECTED', reviewedAt: new Date() },
        });
        return { success: true };
    }
    async generateBulkTokens(orgId) {
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
    async trackEvent(token, event, metadata = {}) {
        const buyer = await this.prisma.buyer.findUnique({ where: { intakeToken: token }, select: { id: true } });
        if (!buyer)
            return { ok: false };
        const validEvents = {
            'INTAKE_OPENED': 'INTAKE_OPENED', 'INTAKE_STEP_2': 'INTAKE_STEP_2',
            'INTAKE_STEP_3': 'INTAKE_STEP_3', 'INTAKE_STEP_4': 'INTAKE_STEP_4',
            'INTAKE_STEP_5': 'INTAKE_STEP_5', 'INTAKE_STEP_6': 'INTAKE_STEP_6',
            'INTAKE_COMPLETED': 'INTAKE_COMPLETED', 'INTAKE_ABANDONED': 'INTAKE_ABANDONED',
        };
        if (!validEvents[event])
            return { ok: false, error: 'Invalid event' };
        await this.prisma.buyerEvent.create({
            data: { buyerId: buyer.id, eventType: validEvents[event], metadata },
        });
        return { ok: true };
    }
};
exports.IntakeService = IntakeService;
exports.IntakeService = IntakeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notifications_service_1.NotificationsService])
], IntakeService);
//# sourceMappingURL=intake.service.js.map