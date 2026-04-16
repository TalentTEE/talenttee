import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceConnection } from '../entities/data-source-connection.entity.js';
import { DatasourceController } from './datasource.controller.js';
import { DatasourceService } from './datasource.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([DataSourceConnection])],
  controllers: [DatasourceController],
  providers: [DatasourceService],
  exports: [DatasourceService],
})
export class DatasourceModule {}
