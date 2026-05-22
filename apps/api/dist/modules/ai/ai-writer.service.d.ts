import { ConfigService } from '@nestjs/config';
export interface DealPitchInput {
    deal: {
        address: string;
        city: string;
        state: string;
        zipCode: string;
        askingPrice: number;
        arv?: number;
        repairEstimate?: number;
        beds?: number;
        baths?: number;
        sqft?: number;
        yearBuilt?: number;
        propertyType: string;
        occupancy: string;
        flipScore?: number;
        landlordScore?: number;
        sellerNotes?: string;
    };
    buyer?: {
        firstName: string;
        investorType: string;
        buyBox?: {
            investmentStrategy?: string[];
            rehabTolerance?: string;
        };
    };
    format: 'sms' | 'email_subject' | 'email_body' | 'pitch' | 'summary';
}
export declare class AiWriterService {
    private config;
    private readonly logger;
    private openai;
    constructor(config: ConfigService);
    generateDealContent(input: DealPitchInput): Promise<string>;
    generatePropertyAnalysis(deal: any): Promise<{
        flipScore: number;
        landlordScore: number;
        cashBuyerDemand: number;
        riskScore: number;
        summary: string;
        investorInsights: string[];
    }>;
    generateCampaignSequence(deal: any, tier: string): Promise<{
        sms1: string;
        sms2: string;
        email_subject: string;
        email_body: string;
        followUp: string;
    }>;
    updateRealBuyBox(buyerId: string, purchases: any[]): Promise<any>;
}
