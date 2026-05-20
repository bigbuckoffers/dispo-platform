import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MatchingService } from './matching.service';

@Processor('matching')
export class MatchingProcessor {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(
    private matchingService: MatchingService,
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Process('match-deal')
  async handleMatchDeal(job: Job<{ dealId: string; orgId: string }>) {
    const { dealId, orgId } = job.data;

    await this.prisma.matchJob.updateMany({
      where: { dealId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const matches = await this.matchingService.runMatchingForDeal(dealId, orgId);

    await this.prisma.matchJob.updateMany({
      where: { dealId },
      data: {
        status: 'COMPLETE',
        completedAt: new Date(),
        matchCount: matches.length,
      },
    });

    // Emit event so dispo module can send notifications
    this.eventEmitter.emit('matching.completed', { dealId, orgId, matchCount: matches.length, topMatches: matches.slice(0, 5) });

    return { matchCount: matches.length };
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} (${job.name})`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`, err.stack);
    await this.prisma.matchJob.updateMany({
      where: { dealId: job.data.dealId },
      data: { status: 'FAILED', errorMsg: err.message },
    });
  }
}
