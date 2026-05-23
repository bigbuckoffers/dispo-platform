import { Module } from '@nestjs/common';
import { DealSourcesService } from './deal-sources.service';
import { DealSourcesController } from './deal-sources.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DealSourcesController],
  providers: [DealSourcesService],
  exports: [DealSourcesService],
})
export class DealSourcesModule {}
