import { Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MatchingService } from './matching.service';
export declare class MatchingProcessor {
    private matchingService;
    private prisma;
    private eventEmitter;
    private readonly logger;
    constructor(matchingService: MatchingService, prisma: PrismaService, eventEmitter: EventEmitter2);
    handleMatchDeal(job: Job<{
        dealId: string;
        orgId: string;
    }>): Promise<{
        matchCount: number;
    }>;
    onActive(job: Job): void;
    onCompleted(job: Job, result: any): void;
    onFailed(job: Job, err: Error): Promise<void>;
}
