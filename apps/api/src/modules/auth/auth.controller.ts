import { Controller, Get, Post, Body, Headers, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Webhook } from 'svix';
import { ConfigService } from '@nestjs/config';
import { Public, CurrentUser } from '../../shared/decorators';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  /** Clerk webhook — called when a user signs up */
  @Post('webhooks/clerk')
  @Public()
  async handleClerkWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() body: any,
  ) {
    const secret = this.config.get('CLERK_WEBHOOK_SECRET');
    if (secret) {
      const wh = new Webhook(secret);
      try {
        wh.verify(JSON.stringify(body), {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch {
        return { error: 'Invalid signature' };
      }
    }

    if (body.type === 'user.created') {
      await this.authService.syncUserFromClerk(body.data);
    }

    return { received: true };
  }
}
