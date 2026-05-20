// auth.service.ts
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { TeamRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private prisma: PrismaService) {}

  /** Called on user.created Clerk webhook — provisions user + org */
  async syncUserFromClerk(clerkPayload: any) {
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      image_url,
    } = clerkPayload;

    const email = email_addresses?.[0]?.email_address;
    if (!email) throw new Error('No email in Clerk payload');

    const existing = await this.prisma.user.findUnique({ where: { clerkId } });
    if (existing) return existing;

    // Create user
    const user = await this.prisma.user.create({
      data: {
        clerkId,
        email,
        firstName: first_name ?? 'User',
        lastName: last_name ?? '',
        avatarUrl: image_url,
      },
    });

    // Auto-create their personal org
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
      data: { organizationId: org.id, userId: user.id, role: TeamRole.OWNER, acceptedAt: new Date() },
    });

    this.logger.log(`New user provisioned: ${email}`);
    return user;
  }

  async getProfile(userId: string) {
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
}
