import { PrismaService } from '../../shared/prisma/prisma.service';
export declare class DealsAiAnalyzeService {
    private prisma;
    private openai;
    constructor(prisma: PrismaService);
    analyzeDeal(dealId: string): Promise<any>;
}
