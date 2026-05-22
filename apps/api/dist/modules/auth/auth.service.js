"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const client_1 = require("@prisma/client");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async syncUserFromClerk(clerkPayload) {
        const { id: clerkId, email_addresses, first_name, last_name, image_url, } = clerkPayload;
        const email = email_addresses?.[0]?.email_address;
        if (!email)
            throw new Error('No email in Clerk payload');
        const existing = await this.prisma.user.findUnique({ where: { clerkId } });
        if (existing)
            return existing;
        const user = await this.prisma.user.create({
            data: {
                clerkId,
                email,
                firstName: first_name ?? 'User',
                lastName: last_name ?? '',
                avatarUrl: image_url,
            },
        });
        const slug = `org-${user.id.slice(0, 8)}`;
        const org = await this.prisma.organization.create({
            data: {
                name: `${user.firstName}'s Org`,
                slug,
                plan: 'STARTER',
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
        });
        await this.prisma.teamMember.create({
            data: { organizationId: org.id, userId: user.id, role: client_1.TeamRole.OWNER, acceptedAt: new Date() },
        });
        this.logger.log(`New user provisioned: ${email}`);
        return user;
    }
    async getProfile(userId) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                memberships: {
                    include: {
                        organization: {
                            select: { id: true, name: true, slug: true, plan: true, isActive: true },
                        },
                    },
                },
            },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map