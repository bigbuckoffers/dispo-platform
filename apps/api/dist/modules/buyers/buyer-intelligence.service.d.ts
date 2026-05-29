import { PrismaService } from "../../shared/prisma/prisma.service";
export declare class BuyerIntelligenceService {
    private prisma;
    private readonly logger;
    private openai;
    constructor(prisma: PrismaService);
    private getOpenAI;
    backfillBuyBoxes(): Promise<{
        updated: number;
        created: number;
        skipped: number;
    }>;
    generateBuyerProfile(buyerId: string): Promise<string>;
    generateAllMissingProfiles(limit?: number): Promise<{
        generated: number;
        failed: number;
    }>;
    generateAiSummary(buyerId: string): Promise<string>;
    generateAllMissingAiSummaries(limit?: number): Promise<{
        generated: number;
        failed: number;
    }>;
}
