export interface DealScoringInput {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    propertyType?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    askingPrice?: number;
    arv?: number;
    repairEstimate?: number;
    buyerFacingPrice?: number;
    rentEstimate?: number;
    zillowEstimate?: number;
    realtorEstimate?: number;
    redfinEstimate?: number;
    rentcastEstimate?: number;
    dealType?: string;
    sourceType?: string;
    occupancy?: string;
    overallCondition?: string;
    financingAllowed?: string;
    vacantAtClose?: string;
    accessInfo?: string;
    description?: string;
    photosUrl?: string;
    googleDriveUrl?: string;
    photos?: string[];
    closingDate?: Date;
    assignmentDeadline?: Date;
    matchedBuyerCount?: number;
    tier1MatchCount?: number;
    buyerDemandScore?: number;
    sourceReliabilityScore?: number;
    sourceReliabilityLabel?: string;
}
export interface DealScoreResult {
    dealPriorityScore: number;
    buyerDemandScore: number;
    dataCompletenessScore: number;
    missingInfo: string[];
    missingInfoCount: number;
    nextBestAction: string;
    buyerCoverageStatus: string;
    buyerGapScore: number;
    marketKey: string;
}
export declare class DealsScoringService {
    calculateMetrics(deal: DealScoringInput): DealScoreResult;
}
