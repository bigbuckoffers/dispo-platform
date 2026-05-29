import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
export declare class MessagesService {
    private prisma;
    private config;
    private readonly logger;
    private twilioClient;
    constructor(prisma: PrismaService, config: ConfigService);
    getConversations(orgId: string): Promise<({
        buyer: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string;
            tier: import(".prisma/client").$Enums.BuyerTier;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        buyerId: string;
        lastMessageAt: Date;
        lastMessageBody: string | null;
        unreadCount: number;
    })[]>;
    getMessages(orgId: string, buyerId: string): Promise<{
        smsMessages: {
            id: string;
            createdAt: Date;
            status: string;
            body: string;
            conversationId: string;
            direction: string;
            twilioSid: string | null;
            fromNumber: string | null;
            toNumber: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        buyerId: string;
        lastMessageAt: Date;
        lastMessageBody: string | null;
        unreadCount: number;
    }>;
    sendMessage(orgId: string, buyerId: string, body: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        body: string;
        conversationId: string;
        direction: string;
        twilioSid: string | null;
        fromNumber: string | null;
        toNumber: string | null;
    }>;
    handleInbound(data: any): Promise<{
        success: boolean;
    }>;
    sendBulk(orgId: string, buyerIds: string[], body: string, delayMs?: number): Promise<{
        queued: number;
        estimatedMinutes: number;
    }>;
    private sendViaTwilio;
}
