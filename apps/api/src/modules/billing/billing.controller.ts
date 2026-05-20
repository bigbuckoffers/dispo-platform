import {
  Controller, Get, Post, Body, Headers, Req, UseGuards, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PlanType } from '@prisma/client';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Public, OrgId } from '../../shared/decorators';
import { BillingService } from './billing.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  createCheckout(
    @OrgId() orgId: string,
    @Body('plan') plan: PlanType,
    @Body('returnUrl') returnUrl: string,
  ) {
    return this.billingService.createCheckoutSession(orgId, plan, returnUrl);
  }

  @Post('portal')
  createPortal(@OrgId() orgId: string, @Body('returnUrl') returnUrl: string) {
    return this.billingService.createBillingPortalSession(orgId, returnUrl);
  }

  @Post('webhooks/stripe')
  @Public()
  handleWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.billingService.handleWebhook(req.rawBody, sig);
  }
}
