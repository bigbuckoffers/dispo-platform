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
exports.DealsAiAnalyzeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const openai_1 = require("openai");
let DealsAiAnalyzeService = class DealsAiAnalyzeService {
    constructor(prisma) {
        this.prisma = prisma;
        this.openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    }
    async analyzeDeal(dealId) {
        console.log('Analyzing deal:', dealId);
        console.log('OpenAI key set:', !!process.env.OPENAI_API_KEY);
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
Deal Notes: ${deal.conditionNotes || 'none'}
Description: ${deal.description || 'none'}

Return this exact JSON:
{
  "verdict": "STRONG",
  "verdictReason": "one sentence why",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "redFlags": ["flag 1"],
  "buyerProfile": "one sentence describing ideal buyer",
  "pitch": "2-3 sentence buyer-facing pitch",
  "dispoScoreBonus": 10,
  "dealScoreBonus": 15,
  "sellabilityNotes": "one sentence on how fast this will move"
}

verdict must be one of: STRONG, POSSIBLE, RISKY, PASS
dispoScoreBonus: integer -20 to +20
dealScoreBonus: integer -25 to +25`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: 1000,
        });
        const raw = response.choices[0].message.content || '{}';
        console.log('AI raw response:', raw.substring(0, 200));
        const result = JSON.parse(raw);
        await this.prisma.deal.update({
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DealsAiAnalyzeService);
//# sourceMappingURL=deals-ai-analyze.service.js.map