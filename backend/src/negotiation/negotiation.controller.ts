import {
  Controller, Post, Get, Body, Param, Req, UseGuards, HttpCode,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { NegotiationService } from './negotiation.service.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { InterveneDto } from './dto/intervene.dto.js';

@Controller('negotiation')
@UseGuards(JwtGuard)
export class NegotiationController {
  constructor(private readonly negotiationService: NegotiationService) {}

  @Get('sessions')
  async listSessions(@Req() req) {
    const userId = req.user.id;
    return this.negotiationService.listSessions(userId);
  }

  @Post('sessions')
  async createSession(@Body() dto: CreateSessionDto) {
    return this.negotiationService.createSession(dto.jobId, dto.seekerId, dto.maxRounds);
  }

  @Post('sessions/:id/start')
  @HttpCode(202)
  async startNegotiation(@Param('id') id: string) {
    await this.negotiationService.startNegotiation(id);
    return { message: 'Negotiation started', sessionId: id };
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    return this.negotiationService.getSession(id);
  }

  @Get('sessions/:id/rounds')
  async getRounds(@Param('id') id: string) {
    return this.negotiationService.getRounds(id);
  }

  @Get('sessions/:id/rounds/decrypted')
  async getDecryptedRounds(@Param('id') id: string) {
    return this.negotiationService.getDecryptedRounds(id);
  }

  @Post('sessions/:id/intervene')
  async intervene(@Param('id') id: string, @Req() req, @Body() dto: InterveneDto) {
    await this.negotiationService.intervene(id, req.user.id, dto.direction);
    return { message: 'Intervention registered', sessionId: id };
  }

  @Get('sessions/:id/match-context')
  async getMatchContext(@Param('id') id: string) {
    return this.negotiationService.getMatchContext(id);
  }

  @Post('sessions/:id/decrypt')
  async decryptRounds(@Param('id') id: string, @Body() body: { sessionKey: string }) {
    return this.negotiationService.decryptRounds(id, body.sessionKey);
  }
}
