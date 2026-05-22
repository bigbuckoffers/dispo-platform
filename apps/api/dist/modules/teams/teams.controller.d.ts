import { TeamRole } from '@prisma/client';
import { TeamsService } from './teams.service';
export declare class TeamsController {
    private readonly teamsService;
    constructor(teamsService: TeamsService);
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
    invite(orgId: string, userId: string, body: {
        email: string;
        role: TeamRole;
    }): Promise<{
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
    updateRole(orgId: string, id: string, role: TeamRole): Promise<{
        id: string;
        createdAt: Date;
        organizationId: string;
        userId: string;
        role: import(".prisma/client").$Enums.TeamRole;
        invitedBy: string | null;
        acceptedAt: Date | null;
    }>;
    remove(orgId: string, id: string): Promise<void>;
}
