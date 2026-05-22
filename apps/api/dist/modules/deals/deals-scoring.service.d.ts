export interface DealMetrics {
    spread: number;
    seventyPercentRuleMax: number;
    pricePerSqft: number;
    arvPerSqft: number;
    rentToPriceRatio: number;
    dealPriorityScore: number;
    dataCompletenessScore: number;
    missingInfoCount: number;
    missingInfo: string[];
    nextBestAction: string;
    buyerCoverageStatus: string;
    buyerGapScore: number;
    marketKey: string;
    marketBuyerNeedRecommendation: string;
}
export declare class DealsScoringService {
    calculateMetrics(deal: any): DealMetrics;
    private calcDataCompleteness;
    private calcPriorityScore;
    private calcNextBestAction;
    private buildMarketKey;
    private calcBuyerCoverage;
    getPriorityLabel(score: number): {
        label: string;
        color: string;
    };
}
