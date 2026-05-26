import { PrismaService } from '../../shared/prisma/prisma.service';
interface RawComp {
    address: string;
    saleDate: string;
    salePrice: number;
    sqft: number;
    beds: number;
    baths: number;
    yearBuilt?: number;
    lotSize?: number;
    propertyType?: string;
    subdivision?: string;
    renovationEvidence?: string;
    sourcePortal: string;
    sourceUrl: string;
    scrapedAt: string;
}
interface ValidatedComp extends RawComp {
    confidenceScore: number;
    confidenceFactors: Record<string, number>;
    validationFlags: string[];
    subdivisionProven: boolean;
    manuallyApproved?: boolean;
    approvalNote?: string;
    weightedValue: number;
}
type OutputState = 'VERIFIED_ARV' | 'PRELIMINARY_ARV' | 'WEAK_COMP_SET' | 'NEEDS_REVIEW' | 'INSUFFICIENT_DATA' | 'MANUAL_REVIEW_REQUIRED';
export declare class ArvEngineService {
    private prisma;
    private openai;
    constructor(prisma: PrismaService);
    runArvEngine(dealId: string, manualApprovals?: {
        compAddress: string;
        note: string;
    }[]): Promise<{
        outputState: OutputState;
        reason: string;
        conflicts: string[];
        rawCompCount: number;
        validatedComps: any[];
        arvLow: any;
        arvMedian: any;
        arvHigh: any;
        aiNarrative: any;
        subject?: undefined;
        validatedCompCount?: undefined;
        subdivisionProven?: undefined;
        avgConfidenceScore?: undefined;
        validationLog?: undefined;
        scrapedAt?: undefined;
        claudeNarrative?: undefined;
    } | {
        outputState: OutputState;
        subject: {
            address: string;
            sqft: number;
            beds: number;
            baths: number;
            yearBuilt: number;
            propertyType: import(".prisma/client").$Enums.PropertyType;
            zipCode: string;
            city: string;
            state: string;
        };
        rawCompCount: number;
        validatedCompCount: number;
        validatedComps: ValidatedComp[];
        arvLow: number;
        arvMedian: number;
        arvHigh: number;
        subdivisionProven: boolean;
        avgConfidenceScore: number;
        aiNarrative: any;
        validationLog: any;
        scrapedAt: string;
        claudeNarrative: any;
        reason?: undefined;
        conflicts?: undefined;
    }>;
    private scrapeRedfin;
    private normalizeComps;
    private detectSubjectConflicts;
    private validateAndScoreComps;
    private determineOutputState;
    private calculateWeightedArv;
    private getAiNarrative;
    private buildValidationLog;
}
export {};
