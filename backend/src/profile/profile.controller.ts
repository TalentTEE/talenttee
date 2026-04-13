import { Controller, Post, Get, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { ProfileService } from './profile.service.js';

@Controller('profile')
@UseGuards(JwtGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post(':seekerId/access')
  async requestAccess(@Req() req, @Param('seekerId') seekerId: string) {
    this.ensureEmployer(req);
    const employerId = req.user.id;
    return this.profileService.requestAccess(employerId, seekerId, req.user.nearAccountId);
  }

  @Get(':seekerId/report')
  async getReport(@Req() req, @Param('seekerId') seekerId: string) {
    this.ensureEmployer(req);
    const employerId = req.user.id;
    return this.profileService.getReport(employerId, seekerId);
  }

  @Get('access/history')
  async getAccessHistory(@Req() req) {
    this.ensureEmployer(req);
    const employerId = req.user.id;
    return this.profileService.getAccessHistory(employerId);
  }

  private ensureEmployer(req: any) {
    if (req.user.role !== 'EMPLOYER') {
      throw new ForbiddenException('Employer only');
    }
  }
}
