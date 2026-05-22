import { MarketplaceService } from './marketplace.service';
export declare class MarketplaceController {
    private readonly marketplaceService;
    constructor(marketplaceService: MarketplaceService);
    getListings(query: any): Promise<{
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
    publish(orgId: string, id: string): Promise<{
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
    saveDeal(buyerId: string, id: string, notes?: string): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        buyerId: string;
        dealId: string;
    }>;
    getSaved(buyerId: string): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        buyerId: string;
        dealId: string;
    }[]>;
}
