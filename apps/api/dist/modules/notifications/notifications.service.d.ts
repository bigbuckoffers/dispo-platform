import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, type: NotificationType, title: string, body: string, link?: string, metadata?: any): Promise<{
        link: string | null;
        id: string;
        createdAt: Date;
        userId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        type: import(".prisma/client").$Enums.NotificationType;
        body: string;
        title: string;
        isRead: boolean;
    }>;
    getForUser(userId: string, unreadOnly?: boolean): Promise<{
        link: string | null;
        id: string;
        createdAt: Date;
        userId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        type: import(".prisma/client").$Enums.NotificationType;
        body: string;
        title: string;
        isRead: boolean;
    }[]>;
    markRead(userId: string, notificationId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getUnreadCount(userId: string): Promise<number>;
}
