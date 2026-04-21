import { Module } from '@nestjs/common';
import { RelayController } from './relay.controller.js';
import { RelayService } from './relay.service.js';

@Module({
  controllers: [RelayController],
  providers: [RelayService],
  exports: [RelayService],
})
export class RelayModule {}
