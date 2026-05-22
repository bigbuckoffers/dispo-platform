import { RawBodyRequest } from '@nestjs/common';
import { PlanType } from '@prisma/client';
import { BillingService } from './billing.service';
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    createCheckout(orgId: string, plan: PlanType, returnUrl: string): Promise<{
        url: string;
        sessionId: string;
    }>;
    createPortal(orgId: string, returnUrl: string): Promise<{
        url: string;
    }>;
    handleWebhook(req: RawBodyRequest<any>, sig: string): Promise<{
        received: boolean;
    }>;
}
