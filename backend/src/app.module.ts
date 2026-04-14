import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { databaseConfig } from './config/database.config.js';
import { AuthModule } from './auth/auth.module.js';
import { EscrowModule } from './escrow/escrow.module.js';
import { CryptoModule } from './crypto/crypto.module.js';
import { JobModule } from './job/job.module.js';
import { NegotiationModule } from './negotiation/negotiation.module.js';
import { AgreementModule } from './agreement/agreement.module.js';
import { AgentModule } from './agent/agent.module.js';
import { DatasourceModule } from './datasource/datasource.module.js';
import { ResumeModule } from './resume/resume.module.js';
import { MatchModule } from './match/match.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { SeekerModule } from './seeker/seeker.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    TypeOrmModule.forRoot(databaseConfig()),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    AgentModule,
    DatasourceModule,
    ResumeModule,
    AuthModule,
    EscrowModule,
    CryptoModule,
    JobModule,
    NegotiationModule,
    AgreementModule,
    MatchModule,
    ProfileModule,
    SeekerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
