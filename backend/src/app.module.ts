import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config.js';
import { AuthModule } from './auth/auth.module.js';
import { EscrowModule } from './escrow/escrow.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    AuthModule,
    EscrowModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
