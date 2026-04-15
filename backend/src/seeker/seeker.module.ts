import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity.js';
import { SeekerController } from './seeker.controller.js';
import { SeekerService } from './seeker.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [SeekerController],
  providers: [SeekerService],
  exports: [SeekerService],
})
export class SeekerModule {}
