import { PrismaService } from '../../shared/prisma/prisma.service';
export declare class MarketplaceService {
    private prisma;
    constructor(prisma: PrismaService);
    getPublicListings(query: any): Promise<{
        data: {
            id: string;
            createdAt: Date;
            organizationId: string;
            dealId: string;
            visibility: import(".prisma/client").$Enums.ListingVisibility;
            featuredUntil: Date | null;
            viewCount: number;
            saveCount: number;
            offerCount: number;
            publishedAt: Date | null;
            expiresAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
        };
    }>;
    publishDeal(dealId: string, orgId: string): Promise<{
        id: string;
        createdAt: Date;
        organizationId: string;
        dealId: string;
        visibility: import(".prisma/client").$Enums.ListingVisibility;
        featuredUntil: Date | null;
        viewCount: number;
        saveCount: number;
        offerCount: number;
        publishedAt: Date | null;
        expiresAt: Date | null;
    }>;
    saveDeal(buyerId: string, dealId: string, notes?: string): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        buyerId: string;
        dealId: string;
    }>;
    getSavedDeals(buyerId: string): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        buyerId: string;
        dealId: string;
    }[]>;
    incrementViewCount(dealId: string): Promise<void>;
}
