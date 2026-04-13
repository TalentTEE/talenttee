import { Controller, Post, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { MatchService } from './match.service.js';

@Controller('match')
@UseGuards(JwtGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('seeker/:seekerId')
  async matchForSeeker(@Param('seekerId') seekerId: string) {
    return this.matchService.matchForSeeker(seekerId);
  }

  @Get('job/:jobId')
  async matchForJob(@Param('jobId') jobId: string) {
    return this.matchService.matchForJob(jobId);
  }

  @Post(':matchId/agree')
  async agree(@Req() req: any, @Param('matchId') matchId: string) {
    const userId = req.user.id ?? req.user.nearAccountId;
    return this.matchService.agree(matchId, userId, req.user.role);
  }

  @Get(':matchId/status')
  async getMatchStatus(@Param('matchId') matchId: string) {
    return this.matchService.getMatchStatus(matchId);
  }
}
