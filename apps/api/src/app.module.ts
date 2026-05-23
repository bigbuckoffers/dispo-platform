import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BuyersModule } from './modules/buyers/buyers.module';
import { DealsModule } from './modules/deals/deals.module';
import { MatchingModule } from './modules/matching/matching.module';
import { DispoModule } from './modules/dispo/dispo.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { BillingModule } from './modules/billing/billing.module';
import { TeamsModule } from './modules/teams/teams.module';
import { RentCastModule } from './modules/rentcast/rentcast.module';
import { DealSourcesModule } from './modules/deal-sources/deal-sources.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
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

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
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

    EventEmitterModule.forRoot({ wildcard: true }),
    ScheduleModule.forRoot(),
    PrismaModule,

    // Feature modules
    AuthModule,
    BuyersModule,
    DealsModule,
    MatchingModule,
    DispoModule,
    MarketplaceModule,
    AnalyticsModule,
    NotificationsModule,
    AiModule,
    BillingModule,
    TeamsModule,
    RentCastModule,
    DealSourcesModule,
  ],
})
export class AppModule {}
