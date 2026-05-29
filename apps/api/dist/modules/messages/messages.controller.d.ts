import { MessagesService } from './messages.service';
export declare class MessagesController {
    private readonly messagesService;
    constructor(messagesService: MessagesService);
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
    getMessages(buyerId: string, orgId: string): Promise<{
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
    sendMessage(buyerId: string, body: {
        message: string;
        orgId?: string;
    }): Promise<{
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
    sendBulk(body: {
        buyerIds: string[];
        message: string;
        delayMs?: number;
        orgId?: string;
    }): Promise<{
        queued: number;
        estimatedMinutes: number;
    }>;
    handleInbound(body: any): Promise<{
        success: boolean;
    }>;
}
