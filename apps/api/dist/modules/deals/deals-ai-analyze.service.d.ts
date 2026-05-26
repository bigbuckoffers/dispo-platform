import { PrismaService } from '../../prisma/prisma.service';
export declare class DealsAiAnalyzeService {
    private prisma;
    private anthropic;
    constructor(prisma: PrismaService);
    analyzeDeal(dealId: string): Promise<any>;
}
