import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PlanType } from '@prisma/client';

const PLAN_PRICE_IDS: Record<PlanType, string> = {
  STARTER: process.env.STRIPE_STARTER_PRICE_ID ?? 'price_starter',
  GROWTH: process.env.STRIPE_GROWTH_PRICE_ID ?? 'price_growth',
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? 'price_enterprise',
};

const PLAN_LIMITS: Record<PlanType, { buyers: number; deals: number; seats: number }> = {
  STARTER: { buyers: 500, deals: 50, seats: 1 },
  GROWTH: { buyers: 5000, deals: -1, seats: 5 }, // -1 = unlimited
  ENTERPRISE: { buyers: -1, deals: -1, seats: -1 },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-04-10',
    });
  }

  async createCheckoutSession(orgId: string, plan: PlanType, returnUrl: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new BadRequestException('Organization not found');

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        metadata: { orgId },
        name: org.name,
      });
      customerId = customer.id;
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PLAN_PRICE_IDS[plan], quantity: 1 }],
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?cancelled=true`,
      metadata: { orgId, plan },
      subscription_data: {
        trial_period_days: plan === PlanType.STARTER ? 14 : 7,
        metadata: { orgId, plan },
      },
    });

    return { url: session.url, sessionId: session.id };
  }

  async createBillingPortalSession(orgId: string, returnUrl: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org?.stripeCustomerId) throw new BadRequestException('No billing account found');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET') ?? '';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const orgId = session.metadata?.orgId;
    const plan = session.metadata?.plan as PlanType;
    if (!orgId || !plan) return;

    const subscription = await this.stripe.subscriptions.retrieve(session.subscription as string);

    await this.prisma.$transaction([
      this.prisma.organization.update({
        where: { id: orgId },
        data: { plan, stripeSubId: subscription.id },
      }),
      this.prisma.subscription.upsert({
        where: { stripeSubscriptionId: subscription.id },
        create: {
          organizationId: orgId,
          stripeSubscriptionId: subscription.id,
          plan,
          status: 'ACTIVE',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        update: {
          plan,
          status: 'ACTIVE',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      }),
    ]);

    this.logger.log(`Org ${orgId} upgraded to ${plan}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const org = await this.prisma.organization.findFirst({
      where: { stripeSubId: subscription.id },
    });
    if (!org) return;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const org = await this.prisma.organization.findFirst({
      where: { stripeSubId: subscription.id },
    });
    if (!org) return;

    await this.prisma.$transaction([
      this.prisma.organization.update({
        where: { id: org.id },
        data: { plan: PlanType.STARTER },
      }),
      this.prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'CANCELLED' },
      }),
    ]);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });
    if (sub) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'PAST_DUE' },
      });
    }
  }

  async getPlanLimits(plan: PlanType) {
    return PLAN_LIMITS[plan];
  }

  async checkLimit(orgId: string, resource: 'buyers' | 'deals' | 'seats'): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return false;

    const limits = PLAN_LIMITS[org.plan];
    const limit = limits[resource];
    if (limit === -1) return true; // unlimited

    const count = await (() => {
      if (resource === 'buyers') return this.prisma.buyer.count({ where: { organizationId: orgId, isActive: true } });
      if (resource === 'deals') return this.prisma.deal.count({ where: { organizationId: orgId } });
      return this.prisma.teamMember.count({ where: { organizationId: orgId } });
    })();

    return count < limit;
  }
}
