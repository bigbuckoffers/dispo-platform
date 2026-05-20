import { Module } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { AiWriterService } from './ai-writer.service';
import { AiController } from './ai.controller';

@Module({
  controllers: [AiController],
  providers: [EmbeddingsService, AiWriterService],
  exports: [EmbeddingsService, AiWriterService],
})
export class AiModule {}
