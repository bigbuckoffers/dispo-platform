import { TeamRole } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
export declare class TeamsService {
    private prisma;
    constructor(prisma: PrismaService);
    getTeam(orgId: string): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            avatarUrl: string;
            lastLoginAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        organizationId: string;
        userId: string;
        role: import(".prisma/client").$Enums.TeamRole;
        invitedBy: string | null;
        acceptedAt: Date | null;
    })[]>;
    inviteMember(orgId: string, email: string, role: TeamRole, invitedById: string): Promise<{
        user: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        organizationId: string;
        userId: string;
        role: import(".prisma/client").$Enums.TeamRole;
        invitedBy: string | null;
        acceptedAt: Date | null;
    }>;
    updateRole(orgId: string, memberId: string, role: TeamRole): Promise<{
        id: string;
        createdAt: Date;
        organizationId: string;
        userId: string;
        role: import(".prisma/client").$Enums.TeamRole;
        invitedBy: string | null;
        acceptedAt: Date | null;
    }>;
    removeMember(orgId: string, memberId: string): Promise<void>;
}
