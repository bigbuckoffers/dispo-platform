import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private openai: OpenAI;
  private readonly MODEL = 'text-embedding-3-large';
  private readonly DIMENSIONS = 1536;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.MODEL,
      input: text.slice(0, 8000), // token limit safety
      dimensions: this.DIMENSIONS,
    });
    return response.data[0].embedding;
  }

  async generateBuyerEmbedding(buyerId: string): Promise<number[]> {
    const [buyer, buyBox, realBuyBox, purchases] = await Promise.all([
      this.prisma.buyer.findUnique({ where: { id: buyerId } }),
      this.prisma.buyBox.findUnique({ where: { buyerId } }),
      this.prisma.realBuyBox.findUnique({ where: { buyerId } }),
      this.prisma.purchaseHistory.findMany({ where: { buyerId }, take: 20 }),
    ]);

    if (!buyer) throw new Error('Buyer not found');

    const text = this.buildBuyerText(buyer, buyBox, realBuyBox, purchases);
    const vector = await this.generateEmbedding(text);
    await this.storeBuyerEmbedding(buyerId, vector);
    return vector;
  }

  async storeBuyerEmbedding(buyerId: string, vector: number[]) {
    const vectorStr = `[${vector.join(',')}]`;
    await this.prisma.$executeRaw`
      INSERT INTO buyer_embeddings (id, buyer_id, vector, updated_at)
      VALUES (uuid_generate_v4(), ${buyerId}::uuid, ${vectorStr}::vector, NOW())
      ON CONFLICT (buyer_id) DO UPDATE 
      SET vector = ${vectorStr}::vector, updated_at = NOW()
    `;
  }

  async storeDealEmbedding(dealId: string, vector: number[]) {
    const vectorStr = `[${vector.join(',')}]`;
    await this.prisma.$executeRaw`
      INSERT INTO deal_embeddings (id, deal_id, vector, updated_at)
      VALUES (uuid_generate_v4(), ${dealId}::uuid, ${vectorStr}::vector, NOW())
      ON CONFLICT (deal_id) DO UPDATE 
      SET vector = ${vectorStr}::vector, updated_at = NOW()
    `;
  }

  /**
   * pgvector cosine similarity search — finds top N buyers most similar to a deal.
   * Much faster than in-memory for large buyer lists.
   */
  async findSimilarBuyers(dealVector: number[], orgId: string, limit = 100): Promise<string[]> {
    const vectorStr = `[${dealVector.join(',')}]`;
    const results = await this.prisma.$queryRaw<Array<{ buyer_id: string; similarity: number }>>`
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

  private buildBuyerText(buyer: any, buyBox: any, realBuyBox: any, purchases: any[]): string {
    const parts = [
      `Investor type: ${buyer.investorType}`,
      buyer.company ? `Company: ${buyer.company}` : '',
    ];

    if (buyBox) {
      if (buyBox.states?.length) parts.push(`Target states: ${buyBox.states.join(', ')}`);
      if (buyBox.zipCodes?.length) parts.push(`Target zip codes: ${buyBox.zipCodes.slice(0, 10).join(', ')}`);
      if (buyBox.propertyTypes?.length) parts.push(`Property types: ${buyBox.propertyTypes.join(', ')}`);
      if (buyBox.minPrice || buyBox.maxPrice) {
        parts.push(`Price range: $${buyBox.minPrice ?? 0} - $${buyBox.maxPrice ?? 'unlimited'}`);
      }
      if (buyBox.investmentStrategy?.length) parts.push(`Strategy: ${buyBox.investmentStrategy.join(', ')}`);
      if (buyBox.rehabTolerance) parts.push(`Rehab tolerance: ${buyBox.rehabTolerance}`);
    }

    // Use real buy box if available and confident
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
}
