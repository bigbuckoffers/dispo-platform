import { AiWriterService } from './ai-writer.service';
export declare class AiController {
    private readonly aiWriter;
    constructor(aiWriter: AiWriterService);
    generateContent(body: any): Promise<string>;
    analyzeDeal(body: any): Promise<{
        flipScore: number;
        landlordScore: number;
        cashBuyerDemand: number;
        riskScore: number;
        summary: string;
        investorInsights: string[];
    }>;
    generateCampaign(body: {
        deal: any;
        tier: string;
    }): Promise<{
        sms1: string;
        sms2: string;
        email_subject: string;
        email_body: string;
        followUp: string;
    }>;
}
