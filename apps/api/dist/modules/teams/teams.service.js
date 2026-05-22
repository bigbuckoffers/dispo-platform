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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
let TeamsService = class TeamsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTeam(orgId) {
        return this.prisma.teamMember.findMany({
            where: { organizationId: orgId },
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, lastLoginAt: true } } },
            orderBy: { createdAt: 'asc' },
        });
    }
    async inviteMember(orgId, email, role, invitedById) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.NotFoundException('User not found — they must sign up first');
        const existing = await this.prisma.teamMember.findFirst({
            where: { organizationId: orgId, userId: user.id },
        });
        if (existing)
            throw new common_1.ConflictException('User already on team');
        return this.prisma.teamMember.create({
            data: { organizationId: orgId, userId: user.id, role, invitedBy: invitedById },
            include: { user: true },
        });
    }
    async updateRole(orgId, memberId, role) {
        return this.prisma.teamMember.update({
            where: { id: memberId },
            data: { role },
        });
    }
    async removeMember(orgId, memberId) {
        await this.prisma.teamMember.delete({ where: { id: memberId } });
    }
};
exports.TeamsService = TeamsService;
exports.TeamsService = TeamsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TeamsService);
//# sourceMappingURL=teams.service.js.map