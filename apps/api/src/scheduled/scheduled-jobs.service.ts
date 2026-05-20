import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../shared/prisma/prisma.service';
import { BuyersService } from '../modules/buyers/buyers.service';
import { AiWriterService } from '../modules/ai/ai-writer.service';
import { EmbeddingsService } from '../modules/ai/embeddings.service';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private prisma: PrismaService,
    private buyersService: BuyersService,
    private aiWriter: AiWriterService,
    private embeddingsService: EmbeddingsService,
  ) {}

  /**
   * Nightly score recalculation for all active buyers.
   * Runs at 2am UTC every day.
   */
  @Cron('0 2 * * *')
  async recalculateAllScores() {
    this.logger.log('Starting nightly score recalculation...');
    let processed = 0;
    let errors = 0;

    const buyers = await this.prisma.buyer.findMany({
      where: { isActive: true, isSuspended: false },
      select: { id: true, organizationId: true },
    });

    this.logger.log(`Recalculating scores for ${buyers.length} buyers`);

    for (const buyer of buyers) {
      try {
        const scores = await this.buyersService.computeBuyerScores(buyer.id);
        await this.prisma.buyer.update({ where: { id: buyer.id }, data: scores });
        await this.prisma.buyerScoreHistory.create({ data: { buyerId: buyer.id, ...scores } });
        processed++;

        // Auto-tier assignment based on composite score
        const newTier = scores.compositeScore >= 75 ? 'TIER_1'
          : scores.compositeScore >= 45 ? 'TIER_2'
          : 'TIER_3';

        await this.prisma.buyer.update({
          where: { id: buyer.id },
          data: { tier: newTier as any },
        });

        // Small delay to avoid hammering the DB
        if (processed % 100 === 0) {
          await new Promise(r => setTimeout(r, 100));
        }
      } catch (err) {
        errors++;
        this.logger.warn(`Score recalc failed for buyer ${buyer.id}: ${err.message}`);
      }
    }

    this.logger.log(`Nightly recalc complete: ${processed} processed, ${errors} errors`);
  }

  /**
   * Real buy box learning — runs every Sunday at 3am UTC.
   * Updates AI-learned buy box from purchase history.
   */
  @Cron('0 3 * * 0')
  async updateRealBuyBoxes() {
    this.logger.log('Starting real buy box update...');

    const buyersWithPurchases = await this.prisma.buyer.findMany({
      where: {
        isActive: true,
        purchases: { some: {} },
      },
      include: {
        purchases: {
          orderBy: { closedAt: 'desc' },
          take: 20,
        },
      },
    });

    for (const buyer of buyersWithPurchases) {
      if (buyer.purchases.length < 3) continue;

      try {
        const learned = await this.aiWriter.updateRealBuyBox(buyer.id, buyer.purchases);
        if (!learned) continue;

        await this.prisma.realBuyBox.upsert({
          where: { buyerId: buyer.id },
          create: {
            buyerId: buyer.id,
            learnedPriceMin: learned.learnedPriceMin,
            learnedPriceMax: learned.learnedPriceMax,
            confidenceScore: learned.confidence ?? 0,
            dataPointCount: buyer.purchases.length,
          },
          update: {
            learnedPriceMin: learned.learnedPriceMin,
            learnedPriceMax: learned.learnedPriceMax,
            confidenceScore: learned.confidence ?? 0,
            dataPointCount: buyer.purchases.length,
            lastUpdated: new Date(),
          },
        });
      } catch (err) {
        this.logger.warn(`Real buy box update failed for ${buyer.id}: ${err.message}`);
      }
    }

    this.logger.log('Real buy box update complete');
  }

  /**
   * Regenerate buyer embeddings for buyers whose buy box changed in the last 24h.
   * Runs at 4am UTC.
   */
  @Cron('0 4 * * *')
  async refreshStaleEmbeddings() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const staleBuyers = await this.prisma.buyer.findMany({
      where: {
        isActive: true,
        updatedAt: { gte: oneDayAgo },
      },
      select: { id: true },
      take: 500,
    });

    this.logger.log(`Refreshing embeddings for ${staleBuyers.length} buyers`);

    for (const buyer of staleBuyers) {
      try {
        await this.embeddingsService.generateBuyerEmbedding(buyer.id);
        await new Promise(r => setTimeout(r, 50)); // rate limit
      } catch (err) {
        this.logger.warn(`Embedding refresh failed for ${buyer.id}: ${err.message}`);
      }
    }
  }

  /**
   * Clean up expired marketplace listings.
   * Runs daily at 1am.
   */
  @Cron('0 1 * * *')
  async expireListings() {
    const result = await this.prisma.marketplaceListing.updateMany({
      where: { expiresAt: { lt: new Date() }, visibility: 'PUBLIC' },
      data: { visibility: 'PRIVATE' },
    });
    this.logger.log(`Expired ${result.count} marketplace listings`);
  }
}
