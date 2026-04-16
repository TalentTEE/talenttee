import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { DatasourceModule } from '../datasource/datasource.module.js';
import { ResumeController } from './resume.controller.js';
import { ResumeService } from './resume.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeProfile]),
    DatasourceModule,
  ],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
