import { DispoService } from './dispo.service';
export declare class DispoController {
    private readonly dispoService;
    constructor(dispoService: DispoService);
    getCampaigns(orgId: string, dealId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        organizationId: string;
        dealId: string;
        status: import(".prisma/client").$Enums.CampaignStatus;
        channel: import(".prisma/client").$Enums.CampaignChannel;
        targetTier: import(".prisma/client").$Enums.BuyerTier;
        subject: string | null;
        body: string;
        scheduledAt: Date | null;
        sentAt: Date | null;
        totalRecipients: number;
        delivered: number;
        opened: number;
        clicked: number;
        replied: number;
        unsubscribed: number;
    }[]>;
    getCampaignStats(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        organizationId: string;
        dealId: string;
        status: import(".prisma/client").$Enums.CampaignStatus;
        channel: import(".prisma/client").$Enums.CampaignChannel;
        targetTier: import(".prisma/client").$Enums.BuyerTier;
        subject: string | null;
        body: string;
        scheduledAt: Date | null;
        sentAt: Date | null;
        totalRecipients: number;
        delivered: number;
        opened: number;
        clicked: number;
        replied: number;
        unsubscribed: number;
    }>;
    handleTwilioWebhook(body: any): Promise<void>;
}
