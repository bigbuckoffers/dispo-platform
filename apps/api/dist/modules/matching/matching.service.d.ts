import { Queue } from 'bull';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EmbeddingsService } from '../ai/embeddings.service';
export interface MatchScore {
    buyerId: string;
    finalScore: number;
    vectorScore: number;
    geoScore: number;
    priceScore: number;
    reliabilityScore: number;
    activityScore: number;
    historicalScore: number;
    rank: number;
    confidencePct: number;
    estimatedOfferMin?: number;
    estimatedOfferMax?: number;
}
export declare class MatchingService {
    private prisma;
    private embeddingsService;
    private matchingQueue;
    private readonly logger;
    private readonly WEIGHTS;
    private readonly MIN_SCORE_THRESHOLD;
    private readonly TOP_N_RESULTS;
    constructor(prisma: PrismaService, embeddingsService: EmbeddingsService, matchingQueue: Queue);
    queueMatchingJob(dealId: string, orgId: string): Promise<{
        jobId: string;
        eta: number;
    }>;
    runMatchingForDeal(dealId: string, orgId: string): Promise<MatchScore[]>;
    private scoreBuyerForDeal;
    private computeGeoScore;
    private computePriceScore;
    private computeHistoricalScore;
    private estimateOfferRange;
    private persistMatchResults;
    getMatchesForDeal(dealId: string, limit?: number): Promise<({
        buyer: {
            buyBox: {
                states: string[];
                minPrice: number;
                maxPrice: number;
            };
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone: string;
            company: string;
            investorType: import(".prisma/client").$Enums.InvestorType;
            tier: import(".prisma/client").$Enums.BuyerTier;
            activityScore: number;
            liquidityScore: number;
            reliabilityScore: number;
        };
    } & {
        id: string;
        activityScore: number;
        reliabilityScore: number;
        buyerId: string;
        dealId: string;
        computedAt: Date;
        rank: number;
        finalScore: number;
        vectorScore: number;
        geoScore: number;
        priceScore: number;
        historicalScore: number;
        confidencePct: number;
        estimatedOfferMin: number | null;
        estimatedOfferMax: number | null;
        notified: boolean;
        notifiedAt: Date | null;
    })[]>;
    private cosineSimilarity;
    private buildDealTextForEmbedding;
}
