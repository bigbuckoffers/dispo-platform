import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PlanType } from '@prisma/client';
export declare class BillingService {
    private prisma;
    private config;
    private readonly logger;
    private stripe;
    constructor(prisma: PrismaService, config: ConfigService);
    createCheckoutSession(orgId: string, plan: PlanType, returnUrl: string): Promise<{
        url: string;
        sessionId: string;
    }>;
    createBillingPortalSession(orgId: string, returnUrl: string): Promise<{
        url: string;
    }>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<{
        received: boolean;
    }>;
    private handleCheckoutCompleted;
    private handleSubscriptionUpdated;
    private handleSubscriptionDeleted;
    private handlePaymentFailed;
    getPlanLimits(plan: PlanType): Promise<{
        buyers: number;
        deals: number;
        seats: number;
    }>;
    checkLimit(orgId: string, resource: 'buyers' | 'deals' | 'seats'): Promise<boolean>;
}
