import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EmbeddingsService } from '../ai/embeddings.service';

export interface MatchScore {
  buyerId: string;
  finalScore: number;
  vectorScore: number;
  geoScore: number;
  priceScore: number;
  reliabilityScore: number;
  activityScore: number;
  historicalScore: number;
  rank: number;
  confidencePct: number;
  estimatedOfferMin?: number;
  estimatedOfferMax?: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  // Matching weights — tunable
  private readonly WEIGHTS = {
    vector: 0.35,
    geo: 0.20,
    price: 0.15,
    reliability: 0.15,
    activity: 0.10,
    historical: 0.05,
  };

  private readonly MIN_SCORE_THRESHOLD = 0.35;
  private readonly TOP_N_RESULTS = 50;

  constructor(
    private prisma: PrismaService,
    private embeddingsService: EmbeddingsService,
    @InjectQueue('matching') private matchingQueue: Queue,
  ) {}

  /**
   * Queue an async matching job for a deal.
   * Returns immediately with job ID — use polling or webhooks for result.
   */
  async queueMatchingJob(dealId: string, orgId: string): Promise<{ jobId: string; eta: number }> {
    const job = await this.matchingQueue.add(
      'match-deal',
      { dealId, orgId },
      { priority: 1, delay: 0 },
    );

    // Update or create match job record
    await this.prisma.matchJob.upsert({
      where: { id: dealId },
      create: { id: dealId, dealId, status: 'QUEUED' },
      update: { status: 'QUEUED', startedAt: null, completedAt: null },
    }).catch(() => {
      this.prisma.matchJob.create({ data: { dealId, status: 'QUEUED' } });
    });

    return { jobId: String(job.id), eta: 8 };
  }

  /**
   * Core matching algorithm. Called by the Bull queue processor.
   * Returns ranked list of buyers most likely to close on this deal.
   */
  async runMatchingForDeal(dealId: string, orgId: string): Promise<MatchScore[]> {
    this.logger.log(`Running matching for deal ${dealId}`);

    const [deal, dealEmbedding] = await Promise.all([
      this.prisma.deal.findUnique({
        where: { id: dealId },
        include: { comps: true },
      }),
      this.prisma.dealEmbedding.findUnique({ where: { dealId } }),
    ]);

    if (!deal) throw new Error(`Deal ${dealId} not found`);

    // Generate deal embedding if it doesn't exist
    let dealVector = dealEmbedding?.vector;
    if (!dealVector) {
      const text = this.buildDealTextForEmbedding(deal);
      dealVector = await this.embeddingsService.generateEmbedding(text);
      await this.embeddingsService.storeDealEmbedding(dealId, dealVector as number[]);
    }

    // Get all active buyers in this org with their embeddings
    const buyers = await this.prisma.buyer.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        isSuspended: false,
      },
      include: {
        buyBox: true,
        realBuyBox: true,
        embedding: true,
        _count: {
          select: { purchases: true, offers: true },
        },
      },
    });

    this.logger.log(`Scoring ${buyers.length} buyers for deal ${dealId}`);

    // Score all buyers
    const scores: MatchScore[] = [];

    for (const buyer of buyers) {
      try {
        const score = await this.scoreBuyerForDeal(buyer, deal, dealVector as any);
        if (score.finalScore >= this.MIN_SCORE_THRESHOLD) {
          scores.push(score);
        }
      } catch (err) {
        this.logger.warn(`Scoring failed for buyer ${buyer.id}: ${err.message}`);
      }
    }

    // Sort by final score descending
    scores.sort((a, b) => b.finalScore - a.finalScore);

    // Assign ranks
    const topScores = scores.slice(0, this.TOP_N_RESULTS).map((s, i) => ({
      ...s,
      rank: i + 1,
    }));

    // Persist match results
    await this.persistMatchResults(dealId, topScores);

    return topScores;
  }

  private async scoreBuyerForDeal(buyer: any, deal: any, dealVector: number[]): Promise<MatchScore> {
    // ── 1. VECTOR SIMILARITY SCORE ─────────────────────────────────────────
    let vectorScore = 0;
    if (buyer.embedding?.vector) {
      vectorScore = this.cosineSimilarity(
        Array.from(buyer.embedding.vector as any),
        dealVector,
      );
      // Normalize to 0-1 (cosine is -1 to 1 but embeddings produce 0-1)
      vectorScore = Math.max(0, vectorScore);
    }

    // ── 2. GEO SCORE ──────────────────────────────────────────────────────
    const geoScore = this.computeGeoScore(buyer.buyBox, deal);

    // ── 3. PRICE RANGE SCORE ──────────────────────────────────────────────
    const priceScore = this.computePriceScore(buyer.buyBox, deal);

    // ── 4. RELIABILITY SCORE (normalized 0-1) ─────────────────────────────
    const reliabilityScore = (buyer.reliabilityScore ?? 50) / 100;

    // ── 5. ACTIVITY SCORE (normalized 0-1) ────────────────────────────────
    const activityScore = (buyer.activityScore ?? 50) / 100;

    // ── 6. HISTORICAL SIMILARITY ──────────────────────────────────────────
    const historicalScore = await this.computeHistoricalScore(buyer.id, deal);

    // ── WEIGHTED FINAL SCORE ──────────────────────────────────────────────
    const finalScore =
      vectorScore * this.WEIGHTS.vector +
      geoScore * this.WEIGHTS.geo +
      priceScore * this.WEIGHTS.price +
      reliabilityScore * this.WEIGHTS.reliability +
      activityScore * this.WEIGHTS.activity +
      historicalScore * this.WEIGHTS.historical;

    const confidencePct = Math.round(finalScore * 100);

    // Estimate offer range based on buyer's historical purchases
    const { min: estimatedOfferMin, max: estimatedOfferMax } =
      this.estimateOfferRange(buyer, deal);

    return {
      buyerId: buyer.id,
      finalScore,
      vectorScore,
      geoScore,
      priceScore,
      reliabilityScore,
      activityScore,
      historicalScore,
      rank: 0, // assigned after sorting
      confidencePct,
      estimatedOfferMin,
      estimatedOfferMax,
    };
  }

  private computeGeoScore(buyBox: any, deal: any): number {
    if (!buyBox) return 0;

    let score = 0;

    // State match
    if (buyBox.states?.includes(deal.state)) score += 0.4;
    else if (buyBox.states?.length === 0) score += 0.2; // buyer is nationwide

    // ZIP match
    if (buyBox.zipCodes?.includes(deal.zipCode)) score += 0.4;
    else if (buyBox.counties?.includes(deal.county)) score += 0.2;

    // County match fallback
    if (buyBox.counties?.length === 0 && buyBox.zipCodes?.length === 0) score += 0.2;

    return Math.min(1, score);
  }

  private computePriceScore(buyBox: any, deal: any): number {
    if (!buyBox) return 0.5;

    const price = deal.askingPrice;
    const min = buyBox.minPrice ?? 0;
    const max = buyBox.maxPrice ?? Infinity;

    if (price >= min && price <= max) return 1;

    // Partial score for being close
    if (price < min) {
      const diff = (min - price) / min;
      return Math.max(0, 1 - diff * 2);
    }
    if (price > max) {
      const diff = (price - max) / max;
      return Math.max(0, 1 - diff * 2);
    }

    return 0;
  }

  private async computeHistoricalScore(buyerId: string, deal: any): Promise<number> {
    const recentPurchases = await this.prisma.purchaseHistory.findMany({
      where: {
        buyerId,
        closedAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
      take: 10,
    });

    if (recentPurchases.length === 0) return 0.3; // neutral

    // Check if similar price range
    const avgPrice = recentPurchases.reduce((s, p) => s + p.purchasePrice, 0) / recentPurchases.length;
    const priceSimilarity = 1 - Math.min(1, Math.abs(deal.askingPrice - avgPrice) / Math.max(avgPrice, 1));

    return Math.min(1, priceSimilarity * 0.5 + (Math.min(recentPurchases.length, 5) / 5) * 0.5);
  }

  private estimateOfferRange(buyer: any, deal: any): { min?: number; max?: number } {
    const askingPrice = deal.askingPrice;
    // Buyers typically offer 85-97% of asking on wholesale deals
    return {
      min: Math.round(askingPrice * 0.85),
      max: Math.round(askingPrice * 0.97),
    };
  }

  private async persistMatchResults(dealId: string, scores: MatchScore[]) {
    // Upsert all match results
    await this.prisma.$transaction(
      scores.map(s =>
        this.prisma.matchResult.upsert({
          where: { dealId_buyerId: { dealId, buyerId: s.buyerId } },
          create: {
            dealId,
            buyerId: s.buyerId,
            finalScore: s.finalScore,
            vectorScore: s.vectorScore,
            geoScore: s.geoScore,
            priceScore: s.priceScore,
            reliabilityScore: s.reliabilityScore,
            activityScore: s.activityScore,
            historicalScore: s.historicalScore,
            rank: s.rank,
            confidencePct: s.confidencePct,
            estimatedOfferMin: s.estimatedOfferMin,
            estimatedOfferMax: s.estimatedOfferMax,
          },
          update: {
            finalScore: s.finalScore,
            rank: s.rank,
            confidencePct: s.confidencePct,
          },
        })
      )
    );
  }

  async getMatchesForDeal(dealId: string, limit = 25) {
    return this.prisma.matchResult.findMany({
      where: { dealId },
      orderBy: { rank: 'asc' },
      take: limit,
      include: {
        buyer: {
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
            company: true, tier: true, investorType: true,
            reliabilityScore: true, liquidityScore: true, activityScore: true,
            buyBox: { select: { states: true, minPrice: true, maxPrice: true } },
          },
        },
      },
    });
  }

  /** Cosine similarity between two float arrays */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private buildDealTextForEmbedding(deal: any): string {
    return [
      `${deal.propertyType} property in ${deal.city}, ${deal.state} ${deal.zipCode}`,
      `Asking price: $${deal.askingPrice}`,
      `ARV: $${deal.arv ?? 'unknown'}`,
      `Repair estimate: $${deal.repairEstimate ?? 'unknown'}`,
      `Beds: ${deal.beds ?? '?'}, Baths: ${deal.baths ?? '?'}, Sqft: ${deal.sqft ?? '?'}`,
      `Year built: ${deal.yearBuilt ?? 'unknown'}`,
      `Occupancy: ${deal.occupancy}`,
      deal.sellerNotes ? `Notes: ${deal.sellerNotes}` : '',
    ].filter(Boolean).join('. ');
  }
}
