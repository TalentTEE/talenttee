import {
  Controller, Post, Get, Body, Param, UseGuards, Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { JobService } from './job.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { ChatMessageDto } from './dto/chat-message.dto.js';

@Controller()
@UseGuards(JwtGuard)
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get('jobs')
  async listJobs(@Req() req) {
    const employerId = req.user.role === 'EMPLOYER' ? req.user.id : undefined;
    return this.jobService.listJobs(employerId);
  }

  @Post('jobs')
  async createJob(@Req() req, @Body() dto: CreateJobDto) {
    this.ensureEmployer(req);
    return this.jobService.createJob(req.user.id, dto);
  }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    return this.jobService.getJob(id);
  }

  @Post('jobs/chat')
  async chatCreateJob(@Req() req, @Body() dto: ChatMessageDto) {
    this.ensureEmployer(req);
    return this.jobService.chatCreateJob(req.user.id, dto.message, dto.sessionId);
  }

  @Post('jobs/:id/boundary/chat')
  async chatSetBoundary(@Req() req, @Param('id') id: string, @Body() dto: ChatMessageDto) {
    this.ensureEmployer(req);
    return this.jobService.chatSetBoundary(id, req.user.id, dto.message, dto.sessionId);
  }

  @Get('jobs/:id/boundary')
  async getBoundary(@Param('id') id: string) {
    return this.jobService.getBoundary(id);
  }

  private ensureEmployer(req: any) {
    if (req.user.role !== 'EMPLOYER') {
      throw new ForbiddenException('Employer only');
    }
  }
}
