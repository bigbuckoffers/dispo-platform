import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DispoService } from './dispo.service';
import { DispoController } from './dispo.controller';
import { DispoProcessor } from './dispo.processor';
import { AiModule } from '../ai/ai.module';
import { IntakeModule } from '../intake/intake.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'dispo' }),
    AiModule,
    IntakeModule,
  ],
  controllers: [DispoController],
  providers: [DispoService, DispoProcessor],
  exports: [DispoService],
})
export class DispoModule {}
