import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { IntakeModule } from '../intake/intake.module';

@Module({
  imports: [PrismaModule, IntakeModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
