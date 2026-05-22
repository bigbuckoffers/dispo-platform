import { PrismaService } from '../../shared/prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getOrgOverview(orgId: string, days?: number): Promise<{
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
    getBuyerActivityHeatmap(orgId: string): Promise<Record<string, number>>;
    getAssignmentFeeReport(orgId: string): Promise<{
        totalFees: number;
        avgFee: number;
        highestFee: number;
        totalTransactions: number;
        byMonth: Record<string, number>;
    }>;
    getDispoRepPerformance(orgId: string): Promise<{
        repId: string;
        name: string;
        dealsIntaken: number;
        offersAccepted: number;
        campaigns: number;
    }[]>;
    private getTopPerformingBuyers;
    private getTopZipCodes;
    private groupByMonth;
}
