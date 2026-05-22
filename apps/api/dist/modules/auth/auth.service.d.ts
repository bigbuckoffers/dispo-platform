import { PrismaService } from '../../shared/prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    syncUserFromClerk(clerkPayload: any): Promise<{
        id: string;
        clerkId: string;
        email: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
        phone: string | null;
        mfaEnabled: boolean;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getProfile(userId: string): Promise<{
        memberships: ({
            organization: {
                id: string;
                isActive: boolean;
                name: string;
                slug: string;
                plan: import(".prisma/client").$Enums.PlanType;
            };
        } & {
            id: string;
            createdAt: Date;
            organizationId: string;
            userId: string;
            role: import(".prisma/client").$Enums.TeamRole;
            invitedBy: string | null;
            acceptedAt: Date | null;
        })[];
    } & {
        id: string;
        clerkId: string;
        email: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
        phone: string | null;
        mfaEnabled: boolean;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
