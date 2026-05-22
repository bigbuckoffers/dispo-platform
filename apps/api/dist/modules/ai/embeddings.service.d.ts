import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
export declare class EmbeddingsService {
    private config;
    private prisma;
    private readonly logger;
    private openai;
    private readonly MODEL;
    private readonly DIMENSIONS;
    constructor(config: ConfigService, prisma: PrismaService);
    generateEmbedding(text: string): Promise<number[]>;
    generateBuyerEmbedding(buyerId: string): Promise<number[]>;
    storeBuyerEmbedding(buyerId: string, vector: number[]): Promise<void>;
    storeDealEmbedding(dealId: string, vector: number[]): Promise<void>;
    findSimilarBuyers(dealVector: number[], orgId: string, limit?: number): Promise<string[]>;
    private buildBuyerText;
}
