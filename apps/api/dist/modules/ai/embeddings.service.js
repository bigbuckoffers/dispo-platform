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
var EmbeddingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = require("openai");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
let EmbeddingsService = EmbeddingsService_1 = class EmbeddingsService {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(EmbeddingsService_1.name);
        this.MODEL = 'text-embedding-3-large';
        this.DIMENSIONS = 1536;
        this.openai = new openai_1.default({ apiKey: config.get('OPENAI_API_KEY') });
    }
    async generateEmbedding(text) {
        const response = await this.openai.embeddings.create({
            model: this.MODEL,
            input: text.slice(0, 8000),
            dimensions: this.DIMENSIONS,
        });
        return response.data[0].embedding;
    }
    async generateBuyerEmbedding(buyerId) {
        const [buyer, buyBox, realBuyBox, purchases] = await Promise.all([
            this.prisma.buyer.findUnique({ where: { id: buyerId } }),
            this.prisma.buyBox.findUnique({ where: { buyerId } }),
            this.prisma.realBuyBox.findUnique({ where: { buyerId } }),
            this.prisma.purchaseHistory.findMany({ where: { buyerId }, take: 20 }),
        ]);
        if (!buyer)
            throw new Error('Buyer not found');
        const text = this.buildBuyerText(buyer, buyBox, realBuyBox, purchases);
        const vector = await this.generateEmbedding(text);
        await this.storeBuyerEmbedding(buyerId, vector);
        return vector;
    }
    async storeBuyerEmbedding(buyerId, vector) {
        const vectorStr = `[${vector.join(',')}]`;
        await this.prisma.$executeRaw `
      INSERT INTO buyer_embeddings (id, buyer_id, vector, updated_at)
      VALUES (uuid_generate_v4(), ${buyerId}::uuid, ${vectorStr}::vector, NOW())
      ON CONFLICT (buyer_id) DO UPDATE 
      SET vector = ${vectorStr}::vector, updated_at = NOW()
    `;
    }
    async storeDealEmbedding(dealId, vector) {
        const vectorStr = `[${vector.join(',')}]`;
        await this.prisma.$executeRaw `
      INSERT INTO deal_embeddings (id, deal_id, vector, updated_at)
      VALUES (uuid_generate_v4(), ${dealId}::uuid, ${vectorStr}::vector, NOW())
      ON CONFLICT (deal_id) DO UPDATE 
      SET vector = ${vectorStr}::vector, updated_at = NOW()
    `;
    }
    async findSimilarBuyers(dealVector, orgId, limit = 100) {
        const vectorStr = `[${dealVector.join(',')}]`;
        const results = await this.prisma.$queryRaw `
      SELECT be.buyer_id::text, 1 - (be.vector <=> ${vectorStr}::vector) as similarity
      FROM buyer_embeddings be
      JOIN buyers b ON b.id = be.buyer_id
      WHERE b.organization_id = ${orgId}::uuid
        AND b.is_active = true
        AND b.is_suspended = false
      ORDER BY be.vector <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;
        return results.map(r => r.buyer_id);
    }
    buildBuyerText(buyer, buyBox, realBuyBox, purchases) {
        const parts = [
            `Investor type: ${buyer.investorType}`,
            buyer.company ? `Company: ${buyer.company}` : '',
        ];
        if (buyBox) {
            if (buyBox.states?.length)
                parts.push(`Target states: ${buyBox.states.join(', ')}`);
            if (buyBox.zipCodes?.length)
                parts.push(`Target zip codes: ${buyBox.zipCodes.slice(0, 10).join(', ')}`);
            if (buyBox.propertyTypes?.length)
                parts.push(`Property types: ${buyBox.propertyTypes.join(', ')}`);
            if (buyBox.minPrice || buyBox.maxPrice) {
                parts.push(`Price range: $${buyBox.minPrice ?? 0} - $${buyBox.maxPrice ?? 'unlimited'}`);
            }
            if (buyBox.investmentStrategy?.length)
                parts.push(`Strategy: ${buyBox.investmentStrategy.join(', ')}`);
            if (buyBox.rehabTolerance)
                parts.push(`Rehab tolerance: ${buyBox.rehabTolerance}`);
        }
        if (realBuyBox && realBuyBox.confidenceScore > 0.5) {
            if (realBuyBox.learnedZipCodes?.length) {
                parts.push(`Actually buys in: ${realBuyBox.learnedZipCodes.slice(0, 10).join(', ')}`);
            }
            if (realBuyBox.learnedPriceMin || realBuyBox.learnedPriceMax) {
                parts.push(`Actual price range: $${realBuyBox.learnedPriceMin ?? 0} - $${realBuyBox.learnedPriceMax ?? 'unlimited'}`);
            }
        }
        if (purchases.length > 0) {
            const avgPrice = purchases.reduce((s, p) => s + p.purchasePrice, 0) / purchases.length;
            parts.push(`Average purchase price: $${Math.round(avgPrice)}`);
            parts.push(`Total purchases: ${purchases.length}`);
        }
        return parts.filter(Boolean).join('. ');
    }
};
exports.EmbeddingsService = EmbeddingsService;
exports.EmbeddingsService = EmbeddingsService = EmbeddingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], EmbeddingsService);
//# sourceMappingURL=embeddings.service.js.map