import { Controller, Post, Get, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { ResumeService } from './resume.service.js';

@Controller('resume')
@UseGuards(JwtGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(@Req() req) {
    const userId = req.user.id ?? req.user.nearAccountId;
    const resume = await this.resumeService.generate(userId);
    return { id: resume.id, status: resume.status, message: '이력서 생성이 시작되었습니다.' };
  }

  @Get(':id')
  async getResume(@Param('id') id: string) {
    return this.resumeService.getResume(id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.resumeService.getStatus(id);
  }

  @Get(':id/market-value')
  async getMarketValue(@Param('id') id: string) {
    return this.resumeService.getMarketValue(id);
  }
}
