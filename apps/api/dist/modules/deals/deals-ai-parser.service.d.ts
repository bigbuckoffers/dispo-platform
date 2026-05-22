export declare class DealsAiParserService {
    private openai;
    constructor();
    parseDealText(rawText: string, sourceType?: string): Promise<any>;
    generateFollowUpMessage(deal: any): Promise<string>;
    generateDealMathSummary(deal: any): Promise<string>;
}
