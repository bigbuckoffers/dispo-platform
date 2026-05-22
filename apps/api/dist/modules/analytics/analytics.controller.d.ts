import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getOverview(orgId: string, days?: number): Promise<{
        buyers: {
            total: number;
            active: number;
            activePct: string;
        };
        deals: {
            total: number;
            active: number;
        };
        offers: {
            submitted: number;
            accepted: number;
            conversionRate: string;
        };
        outreach: {
            delivered: number;
            openRate: string;
            replyRate: string;
        };
        topBuyers: {
            id: string;
            firstName: string;
            lastName: string;
            _count: {
                offers: number;
                purchases: number;
            };
            investorType: import(".prisma/client").$Enums.InvestorType;
            tier: import(".prisma/client").$Enums.BuyerTier;
            compositeScore: number;
        }[];
        topZipCodes: {
            count: number;
            city: string;
            state: string;
            zip: string;
        }[];
    }>;
    getDealVelocity(orgId: string, days?: number): Promise<{
        date: string;
        created: number;
        active: number;
        closed: number;
    }[]>;
    getBuyerHeatmap(orgId: string): Promise<Record<string, number>>;
    getAssignmentFees(orgId: string): Promise<{
        totalFees: number;
        avgFee: number;
        highestFee: number;
        totalTransactions: number;
        byMonth: Record<string, number>;
    }>;
    getRepPerformance(orgId: string): Promise<{
        repId: string;
        name: string;
        dealsIntaken: number;
        offersAccepted: number;
        campaigns: number;
    }[]>;
}
