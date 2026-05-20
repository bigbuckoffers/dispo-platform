import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TeamRole } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async getTeam(orgId: string) {
    return this.prisma.teamMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, lastLoginAt: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteMember(orgId: string, email: string, role: TeamRole, invitedById: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found — they must sign up first');

    const existing = await this.prisma.teamMember.findFirst({
      where: { organizationId: orgId, userId: user.id },
    });
    if (existing) throw new ConflictException('User already on team');

    return this.prisma.teamMember.create({
      data: { organizationId: orgId, userId: user.id, role, invitedBy: invitedById },
      include: { user: true },
    });
  }

  async updateRole(orgId: string, memberId: string, role: TeamRole) {
    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async removeMember(orgId: string, memberId: string) {
    await this.prisma.teamMember.delete({ where: { id: memberId } });
  }
}
