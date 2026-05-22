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
var AiWriterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiWriterService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = require("openai");
let AiWriterService = AiWriterService_1 = class AiWriterService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(AiWriterService_1.name);
        this.openai = new openai_1.default({ apiKey: config.get('OPENAI_API_KEY') });
    }
    async generateDealContent(input) {
        const { deal, buyer, format } = input;
        const systemPrompt = `You are an expert real estate wholesale dispositions specialist. 
Write compelling, concise outreach that gets responses from investors. 
Use specific numbers. Be direct. No fluff. Sound like a real person, not a robot.
Avoid clichés like "motivated seller" or "won't last long".`;
        const dealContext = `
Property: ${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}
Type: ${deal.propertyType} | Occupancy: ${deal.occupancy}
Asking: $${deal.askingPrice.toLocaleString()}
ARV: $${deal.arv?.toLocaleString() ?? 'TBD'}
Repairs: $${deal.repairEstimate?.toLocaleString() ?? 'TBD'}
Specs: ${deal.beds}bd/${deal.baths}ba | ${deal.sqft?.toLocaleString() ?? '?'} sqft | Built ${deal.yearBuilt ?? '?'}
${deal.sellerNotes ? `Notes: ${deal.sellerNotes}` : ''}
${deal.flipScore ? `Flip Score: ${deal.flipScore}/100` : ''}
${deal.landlordScore ? `Landlord Score: ${deal.landlordScore}/100` : ''}`;
        const buyerContext = buyer
            ? `\nBuyer: ${buyer.firstName} | Type: ${buyer.investorType} | Strategy: ${buyer.buyBox?.investmentStrategy?.join(', ') ?? 'general'}`
            : '';
        const formatInstructions = {
            sms: 'Write a 160-character SMS. Include address, price, and a clear CTA. No emojis.',
            email_subject: 'Write an email subject line under 50 characters. Make it specific and intriguing.',
            email_body: 'Write a 3-paragraph investor email. Para 1: deal hook. Para 2: numbers. Para 3: CTA with urgency. Under 200 words.',
            pitch: 'Write a 2-3 sentence deal pitch for a phone call opener.',
            summary: 'Write a 1-paragraph deal summary for the platform listing page. 75-100 words.',
        };
        const userPrompt = `${dealContext}${buyerContext}

Task: ${formatInstructions[format]}`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 500,
        });
        return response.choices[0].message.content?.trim() ?? '';
    }
    async generatePropertyAnalysis(deal) {
        const prompt = `Analyze this wholesale real estate deal and provide investor scores (0-100) and insights.

Property: ${deal.address}, ${deal.city}, ${deal.state}
Type: ${deal.propertyType}
Asking: $${deal.askingPrice.toLocaleString()}
ARV: $${deal.arv?.toLocaleString() ?? 'unknown'}
Repairs: $${deal.repairEstimate?.toLocaleString() ?? 'unknown'}
Specs: ${deal.beds}bd/${deal.baths}ba | ${deal.sqft} sqft | Built ${deal.yearBuilt}
Occupancy: ${deal.occupancy}
Seller Notes: ${deal.sellerNotes ?? 'none'}

Return JSON with:
{
  "flipScore": 0-100,
  "landlordScore": 0-100,
  "cashBuyerDemand": 0-100,
  "riskScore": 0-100,
  "summary": "2-3 sentence analysis",
  "investorInsights": ["insight1", "insight2", "insight3"]
}

flipScore: potential ROI for fix-and-flip
landlordScore: rental demand and cap rate potential
cashBuyerDemand: how many cash buyers will want this
riskScore: title, condition, market, timeline risks
Be data-driven. Use real estate fundamentals.`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        });
        try {
            return JSON.parse(response.choices[0].message.content ?? '{}');
        }
        catch {
            return {
                flipScore: 50, landlordScore: 50, cashBuyerDemand: 50, riskScore: 50,
                summary: 'Analysis unavailable', investorInsights: [],
            };
        }
    }
    async generateCampaignSequence(deal, tier) {
        const prompt = `Create a 5-touch outreach sequence for this wholesale deal targeting ${tier} buyers.

Property: ${deal.address}, ${deal.city}, ${deal.state}
Asking: $${deal.askingPrice.toLocaleString()} | ARV: $${deal.arv?.toLocaleString()}
Repairs: $${deal.repairEstimate?.toLocaleString()}

Return JSON:
{
  "sms1": "Initial SMS (under 160 chars)",
  "sms2": "Follow-up SMS 24hrs later (under 160 chars)",  
  "email_subject": "Email subject (under 50 chars)",
  "email_body": "Email body (under 200 words)",
  "followUp": "48hr follow-up SMS if no response (under 160 chars)"
}`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });
        return JSON.parse(response.choices[0].message.content ?? '{}');
    }
    async updateRealBuyBox(buyerId, purchases) {
        if (purchases.length < 3)
            return null;
        const purchaseData = purchases.map(p => ({
            price: p.purchasePrice,
            address: p.address,
            closedAt: p.closedAt,
        }));
        const prompt = `Analyze these real estate purchase history records and identify the actual buy box patterns.

Purchases: ${JSON.stringify(purchaseData)}

Return JSON with learned patterns:
{
  "learnedPriceMin": number,
  "learnedPriceMax": number,
  "priceSweet spot": "description",
  "patternSummary": "2-3 sentence description of what this buyer actually buys",
  "confidence": 0.0-1.0
}`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.2,
        });
        return JSON.parse(response.choices[0].message.content ?? '{}');
    }
};
exports.AiWriterService = AiWriterService;
exports.AiWriterService = AiWriterService = AiWriterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiWriterService);
//# sourceMappingURL=ai-writer.service.js.map