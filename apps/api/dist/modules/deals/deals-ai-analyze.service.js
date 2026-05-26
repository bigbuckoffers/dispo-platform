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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealsAiAnalyzeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const sdk_1 = require("@anthropic-ai/sdk");
let DealsAiAnalyzeService = class DealsAiAnalyzeService {
    constructor(prisma) {
        this.prisma = prisma;
        this.anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    async analyzeDeal(dealId) {
        const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
        if (!deal)
            throw new Error('Deal not found');
        const prompt = `You are an expert wholesale real estate analyst. Analyze this deal and return ONLY valid JSON, no other text.

DEAL DATA:
Address: ${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}
Asking Price: $${deal.askingPrice || 'unknown'}
ARV: $${deal.arv || 'unknown'}
Repairs: $${deal.repairEstimate || 'unknown'}
Deal Type: ${deal.dealType || 'WHOLESALE'}
Zestimate: $${deal.zillowEstimate || 'unknown'}
Beds/Baths: ${deal.beds || '?'}bd / ${deal.baths || '?'}ba
Sqft: ${deal.sqft || 'unknown'}
Year Built: ${deal.yearBuilt || 'unknown'}
Occupancy: ${deal.occupancy || 'unknown'}
Overall Condition: ${deal.overallCondition || 'unknown'}
Roof: ${deal.roofCondition || 'unknown'} ${deal.roofAge ? '(' + deal.roofAge + ')' : ''}
HVAC: ${deal.hvacCondition || 'unknown'} ${deal.hvacAge ? '(' + deal.hvacAge + ')' : ''}
Foundation: ${deal.foundationCondition || 'unknown'}
Water Heater: ${deal.waterHeaterCondition || 'unknown'} ${deal.waterHeaterAge ? '(' + deal.waterHeaterAge + ')' : ''}
HOA: ${deal.hoaStatus || 'unknown'} ${deal.hoaMonthly ? '($' + deal.hoaMonthly + '/mo)' : ''}
Title Issues: ${deal.titleIssuesNotes || 'none noted'}
Code Violations: ${deal.codeIssues ? (deal.codeViolationDetails || 'yes') : 'none'}
Unpermitted Additions: ${deal.unpermittedAdditions || 'none noted'}
Condition Notes / Deal Notes: ${deal.conditionNotes || 'none'}
Description: ${deal.description || 'none'}

Return this exact JSON structure:
{
  "verdict": "STRONG" | "POSSIBLE" | "RISKY" | "PASS",
  "verdictReason": "one sentence why",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "redFlags": ["flag 1", "flag 2"],
  "buyerProfile": "one sentence describing the ideal buyer for this deal",
  "pitch": "2-3 sentence buyer-facing pitch for this deal",
  "dispoScoreBonus": number between -20 and +20 (positive if easy to sell, negative if hard),
  "dealScoreBonus": number between -25 and +25 (positive if strong numbers, negative if weak),
  "sellabilityNotes": "one sentence on how fast/easy this will move"
}`;
        const response = await this.anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const clean = text.replace(/```json|```/g, '').trim();
        const result = JSON.parse(clean);
        const updated = await this.prisma.deal.update({
            where: { id: dealId },
            data: {
                aiVerdict: result.verdict,
                aiStrengths: result.strengths,
                aiRedFlags: result.redFlags,
                aiBuyerProfile: result.buyerProfile,
                aiPitch: result.pitch,
                aiDispoScoreBonus: result.dispoScoreBonus || 0,
                aiDealScoreBonus: result.dealScoreBonus || 0,
                aiAnalyzedAt: new Date(),
                aiAnalysis: result,
            },
        });
        return { ...result, dealId };
    }
};
exports.DealsAiAnalyzeService = DealsAiAnalyzeService;
exports.DealsAiAnalyzeService = DealsAiAnalyzeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaService !== "undefined" && prisma_service_1.PrismaService) === "function" ? _a : Object])
], DealsAiAnalyzeService);
//# sourceMappingURL=deals-ai-analyze.service.js.map