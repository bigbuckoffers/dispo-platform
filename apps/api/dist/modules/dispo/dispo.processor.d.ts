import { Job } from 'bull';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DispoService } from './dispo.service';
export declare class DispoProcessor {
    private dispoService;
    private prisma;
    private readonly logger;
    constructor(dispoService: DispoService, prisma: PrismaService);
    handleSendSms(job: Job<{
        campaignId: string;
        buyerId: string;
        to: string;
        body: string;
    }>): Promise<void>;
    handleSendEmail(job: Job<{
        campaignId: string;
        buyerId: string;
        to: string;
        subject: string;
        html: string;
    }>): Promise<void>;
    onFailed(job: Job, err: Error): void;
}
