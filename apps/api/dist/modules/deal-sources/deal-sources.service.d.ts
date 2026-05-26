import { PrismaService } from '../../shared/prisma/prisma.service';
export declare const RELIABILITY_LABELS: {
    NEW_SOURCE: string;
    TRUSTED_SOURCE: string;
    GOOD_SOURCE: string;
    SLOW_RESPONSE: string;
    BAD_INFO_BEFORE: string;
    LOW_QUALITY: string;
    CLOSED_BEFORE: string;
    BLACKLIST: string;
};
export declare class DealSourcesService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getDefaultOrgId(): Promise<string>;
    findOrCreate(orgId: string, data: {
        sourceName?: string;
        sourceType?: string;
        phone?: string;
        email?: string;
        company?: string;
        facebookProfileUrl?: string;
        facebookGroupName?: string;
    }): Promise<any>;
    findAll(orgId: string): Promise<({
        _count: {
            deals: number;
        };
    } & {
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        company: string | null;
        reliabilityScore: number;
        isVerified: boolean;
        sourceType: string;
        sourceName: string | null;
        facebookProfileUrl: string | null;
        facebookGroupName: string | null;
        sourceNotes: string | null;
        reliabilityLabel: string;
        totalDealsSubmitted: number;
        activeDeals: number;
        deadDeals: number;
        dealsThatGotInterest: number;
        dealsThatGotOffers: number;
        dealsAssigned: number;
        dealsClosed: number;
        badInfoCount: number;
        missingInfoFrequency: number;
        hadContractConfirmed: boolean;
        permissionToMarket: boolean;
        averageResponseTimeMin: number | null;
        sendsPhotosQuickly: boolean;
        providesAccessQuickly: boolean;
        answersQuestionsClearly: boolean;
        goesGhostCount: number;
        closedRevenueGenerated: number;
        isBlacklisted: boolean;
        lastDealSubmittedAt: Date | null;
    })[]>;
    findOne(id: string): Promise<{
        deals: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.DealStatus;
            address: string;
            city: string;
            state: string;
            dealPriorityScore: number;
        }[];
    } & {
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        company: string | null;
        reliabilityScore: number;
        isVerified: boolean;
        sourceType: string;
        sourceName: string | null;
        facebookProfileUrl: string | null;
        facebookGroupName: string | null;
        sourceNotes: string | null;
        reliabilityLabel: string;
        totalDealsSubmitted: number;
        activeDeals: number;
        deadDeals: number;
        dealsThatGotInterest: number;
        dealsThatGotOffers: number;
        dealsAssigned: number;
        dealsClosed: number;
        badInfoCount: number;
        missingInfoFrequency: number;
        hadContractConfirmed: boolean;
        permissionToMarket: boolean;
        averageResponseTimeMin: number | null;
        sendsPhotosQuickly: boolean;
        providesAccessQuickly: boolean;
        answersQuestionsClearly: boolean;
        goesGhostCount: number;
        closedRevenueGenerated: number;
        isBlacklisted: boolean;
        lastDealSubmittedAt: Date | null;
    }>;
    update(id: string, data: any): Promise<any>;
    recalculateScore(sourceId: string): Promise<any>;
    onDealStatusChanged(sourceId: string, oldStatus: string, newStatus: string): Promise<void>;
    getReliabilityBadge(label: string): Promise<{
        text: string;
        color: string;
    }>;
}
