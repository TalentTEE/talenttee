import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
