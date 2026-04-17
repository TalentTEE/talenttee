import { Module } from '@nestjs/common';
import { SseService } from './sse.service.js';
import { SseController } from './sse.controller.js';

@Module({
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
