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
var BillingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = require("stripe");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const client_1 = require("@prisma/client");
const PLAN_PRICE_IDS = {
    STARTER: process.env.STRIPE_STARTER_PRICE_ID ?? 'price_starter',
    GROWTH: process.env.STRIPE_GROWTH_PRICE_ID ?? 'price_growth',
    ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? 'price_enterprise',
};
const PLAN_LIMITS = {
    STARTER: { buyers: 500, deals: 50, seats: 1 },
    GROWTH: { buyers: 5000, deals: -1, seats: 5 },
    ENTERPRISE: { buyers: -1, deals: -1, seats: -1 },
};
let BillingService = BillingService_1 = class BillingService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(BillingService_1.name);
        this.stripe = new stripe_1.default(config.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2024-04-10',
        });
    }
    async createCheckoutSession(orgId, plan, returnUrl) {
        const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
        if (!org)
            throw new common_1.BadRequestException('Organization not found');
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
                trial_period_days: plan === client_1.PlanType.STARTER ? 14 : 7,
                metadata: { orgId, plan },
            },
        });
        return { url: session.url, sessionId: session.id };
    }
    async createBillingPortalSession(orgId, returnUrl) {
        const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
        if (!org?.stripeCustomerId)
            throw new common_1.BadRequestException('No billing account found');
        const session = await this.stripe.billingPortal.sessions.create({
            customer: org.stripeCustomerId,
            return_url: returnUrl,
        });
        return { url: session.url };
    }
    async handleWebhook(rawBody, signature) {
        const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET') ?? '';
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        }
        catch (err) {
            throw new common_1.BadRequestException(`Webhook signature verification failed: ${err.message}`);
        }
        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(event.data.object);
                break;
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object);
                break;
            case 'invoice.payment_failed':
                await this.handlePaymentFailed(event.data.object);
                break;
        }
        return { received: true };
    }
    async handleCheckoutCompleted(session) {
        const orgId = session.metadata?.orgId;
        const plan = session.metadata?.plan;
        if (!orgId || !plan)
            return;
        const subscription = await this.stripe.subscriptions.retrieve(session.subscription);
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
    async handleSubscriptionUpdated(subscription) {
        const org = await this.prisma.organization.findFirst({
            where: { stripeSubId: subscription.id },
        });
        if (!org)
            return;
        await this.prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                status: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
        });
    }
    async handleSubscriptionDeleted(subscription) {
        const org = await this.prisma.organization.findFirst({
            where: { stripeSubId: subscription.id },
        });
        if (!org)
            return;
        await this.prisma.$transaction([
            this.prisma.organization.update({
                where: { id: org.id },
                data: { plan: client_1.PlanType.STARTER },
            }),
            this.prisma.subscription.updateMany({
                where: { stripeSubscriptionId: subscription.id },
                data: { status: 'CANCELLED' },
            }),
        ]);
    }
    async handlePaymentFailed(invoice) {
        const sub = await this.prisma.subscription.findFirst({
            where: { stripeSubscriptionId: invoice.subscription },
        });
        if (sub) {
            await this.prisma.subscription.update({
                where: { id: sub.id },
                data: { status: 'PAST_DUE' },
            });
        }
    }
    async getPlanLimits(plan) {
        return PLAN_LIMITS[plan];
    }
    async checkLimit(orgId, resource) {
        const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
        if (!org)
            return false;
        const limits = PLAN_LIMITS[org.plan];
        const limit = limits[resource];
        if (limit === -1)
            return true;
        const count = await (() => {
            if (resource === 'buyers')
                return this.prisma.buyer.count({ where: { organizationId: orgId, isActive: true } });
            if (resource === 'deals')
                return this.prisma.deal.count({ where: { organizationId: orgId } });
            return this.prisma.teamMember.count({ where: { organizationId: orgId } });
        })();
        return count < limit;
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = BillingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], BillingService);
//# sourceMappingURL=billing.service.js.map