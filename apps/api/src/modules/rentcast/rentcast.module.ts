import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RentCastService } from './rentcast.service';
import { RentCastController } from './rentcast.controller';

@Module({
  imports: [ConfigModule],
  controllers: [RentCastController],
  providers: [RentCastService],
  exports: [RentCastService],
})
export class RentCastModule {}
