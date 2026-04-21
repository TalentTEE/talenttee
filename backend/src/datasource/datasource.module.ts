import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceConnection } from '../entities/data-source-connection.entity.js';
import { DatasourceController } from './datasource.controller.js';
import { DatasourceService } from './datasource.service.js';
import { PdfParserService } from './pdf-parser.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([DataSourceConnection])],
  controllers: [DatasourceController],
  providers: [DatasourceService, PdfParserService],
  exports: [DatasourceService],
})
export class DatasourceModule {}
