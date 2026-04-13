import { Controller, Post, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { ResumeService } from './resume.service.js';

@Controller('resume')
@UseGuards(JwtGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(@Req() req) {
    const userId = req.user.id;
    const resume = await this.resumeService.generate(userId);
    return { id: resume.id, status: resume.status, message: '이력서 생성이 시작되었습니다.' };
  }

  @Get('me')
  async getMyResume(@Req() req) {
    return this.resumeService.getResumeByUserId(req.user.id);
  }

  @Get('me/status')
  async getMyStatus(@Req() req) {
    return this.resumeService.getStatusByUserId(req.user.id);
  }

  @Get('me/market-value')
  async getMyMarketValue(@Req() req) {
    return this.resumeService.getMarketValueByUserId(req.user.id);
  }
}
