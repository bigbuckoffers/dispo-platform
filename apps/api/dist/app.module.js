"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const bull_1 = require("@nestjs/bull");
const prisma_module_1 = require("./shared/prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const buyers_module_1 = require("./modules/buyers/buyers.module");
const deals_module_1 = require("./modules/deals/deals.module");
const matching_module_1 = require("./modules/matching/matching.module");
const dispo_module_1 = require("./modules/dispo/dispo.module");
const marketplace_module_1 = require("./modules/marketplace/marketplace.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const ai_module_1 = require("./modules/ai/ai.module");
const billing_module_1 = require("./modules/billing/billing.module");
const teams_module_1 = require("./modules/teams/teams.module");
const rentcast_module_1 = require("./modules/rentcast/rentcast.module");
const deal_sources_module_1 = require("./modules/deal-sources/deal-sources.module");
const places_module_1 = require("./modules/places/places.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    throttlers: [
                        {
                            name: 'short',
                            ttl: 1000,
                            limit: 20,
                        },
                        {
                            name: 'medium',
                            ttl: 60000,
                            limit: parseInt(config.get('RATE_LIMIT_PER_MIN', '200')),
                        },
                    ],
                }),
            }),
            bull_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    redis: {
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: parseInt(config.get('REDIS_PORT', '6379')),
                        password: config.get('REDIS_PASSWORD'),
                    },
                    defaultJobOptions: {
                        removeOnComplete: 100,
                        removeOnFail: 500,
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 2000 },
                    },
                }),
            }),
            event_emitter_1.EventEmitterModule.forRoot({ wildcard: true }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            buyers_module_1.BuyersModule,
            deals_module_1.DealsModule,
            matching_module_1.MatchingModule,
            dispo_module_1.DispoModule,
            marketplace_module_1.MarketplaceModule,
            analytics_module_1.AnalyticsModule,
            notifications_module_1.NotificationsModule,
            ai_module_1.AiModule,
            billing_module_1.BillingModule,
            teams_module_1.TeamsModule,
            rentcast_module_1.RentCastModule,
            deal_sources_module_1.DealSourcesModule,
            places_module_1.PlacesModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map