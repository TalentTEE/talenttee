import { Controller, Get, Put, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { SeekerService } from './seeker.service.js';
import { UpdateJobSeekingStatusDto } from './dto/update-job-seeking-status.dto.js';

@Controller('seeker')
@UseGuards(JwtGuard)
export class SeekerController {
  constructor(private readonly seekerService: SeekerService) {}

  @Put('job-seeking-status')
  async updateJobSeekingStatus(@Req() req, @Body() dto: UpdateJobSeekingStatusDto) {
    this.ensureSeeker(req);
    return this.seekerService.updateJobSeekingStatus(req.user.id, dto.active);
  }

  @Get('job-seeking-status')
  async getJobSeekingStatus(@Req() req) {
    this.ensureSeeker(req);
    return this.seekerService.getJobSeekingStatus(req.user.id);
  }

  @Get('preferences')
  async getPreferences(@Req() req) {
    return this.seekerService.getPreferences(req.user.id);
  }

  @Put('preferences')
  async updatePreferences(@Req() req, @Body() body: { salaryFloor?: number; salaryCeiling?: number; autoNegLimit?: number }) {
    return this.seekerService.updatePreferences(req.user.id, body);
  }

  private ensureSeeker(req: any) {
    if (req.user.role !== 'SEEKER') {
      throw new ForbiddenException('Seeker only');
    }
  }
}
