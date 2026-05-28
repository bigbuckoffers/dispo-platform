import { Module } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { IntakeController } from './intake.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntakeController],
  providers: [IntakeService],
  exports: [IntakeService],
})
export class IntakeModule {}
