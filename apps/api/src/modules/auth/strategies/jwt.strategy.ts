// strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface JwtPayload {
  sub: string; // Clerk user ID
  email?: string;
  organizationId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // For Clerk: use the JWT verification key from Clerk dashboard
      secretOrKey: config.get('CLERK_JWT_VERIFICATION_KEY') ?? config.get('JWT_SECRET'),
      algorithms: ['RS256', 'HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    const clerkId = payload.sub;

    // Find or create user from Clerk payload
    let user = await this.prisma.user.findUnique({ where: { clerkId } });

    if (!user) {
      throw new UnauthorizedException('User not found — complete onboarding first');
    }

    // Find their org membership
    const membership = await this.prisma.teamMember.findFirst({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: membership?.organizationId,
      role: membership?.role,
      organization: membership?.organization,
    };
  }
}
