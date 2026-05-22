import { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    private readonly config;
    constructor(authService: AuthService, config: ConfigService);
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
    handleClerkWebhook(req: RawBodyRequest<any>, svixId: string, svixTimestamp: string, svixSignature: string, body: any): Promise<{
        error: string;
        received?: undefined;
    } | {
        received: boolean;
        error?: undefined;
    }>;
}
