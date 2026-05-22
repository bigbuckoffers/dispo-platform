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
var MatchingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const matching_service_1 = require("./matching.service");
let MatchingProcessor = MatchingProcessor_1 = class MatchingProcessor {
    constructor(matchingService, prisma, eventEmitter) {
        this.matchingService = matchingService;
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(MatchingProcessor_1.name);
    }
    async handleMatchDeal(job) {
        const { dealId, orgId } = job.data;
        await this.prisma.matchJob.updateMany({
            where: { dealId },
            data: { status: 'RUNNING', startedAt: new Date() },
        });
        const matches = await this.matchingService.runMatchingForDeal(dealId, orgId);
        await this.prisma.matchJob.updateMany({
            where: { dealId },
            data: {
                status: 'COMPLETE',
                completedAt: new Date(),
                matchCount: matches.length,
            },
        });
        this.eventEmitter.emit('matching.completed', { dealId, orgId, matchCount: matches.length, topMatches: matches.slice(0, 5) });
        return { matchCount: matches.length };
    }
    onActive(job) {
        this.logger.log(`Processing job ${job.id} (${job.name})`);
    }
    onCompleted(job, result) {
        this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
    }
    async onFailed(job, err) {
        this.logger.error(`Job ${job.id} failed: ${err.message}`, err.stack);
        await this.prisma.matchJob.updateMany({
            where: { dealId: job.data.dealId },
            data: { status: 'FAILED', errorMsg: err.message },
        });
    }
};
exports.MatchingProcessor = MatchingProcessor;
__decorate([
    (0, bull_1.Process)('match-deal'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MatchingProcessor.prototype, "handleMatchDeal", null);
__decorate([
    (0, bull_1.OnQueueActive)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MatchingProcessor.prototype, "onActive", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MatchingProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", Promise)
], MatchingProcessor.prototype, "onFailed", null);
exports.MatchingProcessor = MatchingProcessor = MatchingProcessor_1 = __decorate([
    (0, bull_1.Processor)('matching'),
    __metadata("design:paramtypes", [matching_service_1.MatchingService,
        prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], MatchingProcessor);
//# sourceMappingURL=matching.processor.js.map