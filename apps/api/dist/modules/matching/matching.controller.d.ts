import { MatchingService } from './matching.service';
export declare class MatchingController {
    private readonly matchingService;
    constructor(matchingService: MatchingService);
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
}
