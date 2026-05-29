import { PrismaService } from '../../shared/prisma/prisma.service';
export declare class DealsMatchingService {
    private prisma;
    private readonly logger;
    private openai;
    private readonly GATE_MIN_FINANCIAL_SCORE;
    private readonly MAX_MATCHES;
    constructor(prisma: PrismaService);
    runMatchingForDeal(dealId: string): Promise<any>;
    private runFinancialGate;
    private preFilterBuyers;
    private aiScoreBuyer;
    private generateMatchSummary;
    private persistResults;
    getMatchesForDeal(dealId: string, limit?: number): Promise<({
        buyer: {
            buyBox: {
                states: string[];
                zipCodes: string[];
                propertyTypes: import(".prisma/client").$Enums.PropertyType[];
                minPrice: number;
                maxPrice: number;
                investmentStrategy: import(".prisma/client").$Enums.InvestmentStrategy[];
                rehabTolerance: import(".prisma/client").$Enums.RehabTolerance;
            };
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone: string;
            company: string;
            investorType: import(".prisma/client").$Enums.InvestorType;
            hasCash: boolean;
            hasHardMoney: boolean;
            marketPrimary: string;
            buyerIntelNotes: string;
            preferredStrategies: string[];
            marketSecondary: string[];
            dealBreakers: string[];
            aiSummary: string;
            tier: import(".prisma/client").$Enums.BuyerTier;
            compositeScore: number;
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
    private calculateSniperScore;
    runFinancialGateOnly(deal: any): any;
    private getBuyerCoverageStatus;
}
