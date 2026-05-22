import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    email?: string;
    organizationId?: string;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private config;
    private prisma;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        clerkId: string;
        email: string;
        firstName: string;
        lastName: string;
        organizationId: string;
        role: import(".prisma/client").$Enums.TeamRole;
        organization: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            plan: import(".prisma/client").$Enums.PlanType;
            stripeCustomerId: string | null;
            stripeSubId: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            trialEndsAt: Date | null;
        };
    }>;
}
export {};
