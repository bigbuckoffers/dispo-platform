import { PrismaService } from '../shared/prisma/prisma.service';
import { BuyersService } from '../modules/buyers/buyers.service';
import { AiWriterService } from '../modules/ai/ai-writer.service';
import { EmbeddingsService } from '../modules/ai/embeddings.service';
export declare class ScheduledJobsService {
    private prisma;
    private buyersService;
    private aiWriter;
    private embeddingsService;
    private readonly logger;
    constructor(prisma: PrismaService, buyersService: BuyersService, aiWriter: AiWriterService, embeddingsService: EmbeddingsService);
    recalculateAllScores(): Promise<void>;
    updateRealBuyBoxes(): Promise<void>;
    refreshStaleEmbeddings(): Promise<void>;
    expireListings(): Promise<void>;
}
