import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity.js';

@Injectable()
export class SeekerService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async updateJobSeekingStatus(userId: string, active: boolean): Promise<{ jobSeeking: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.jobSeeking = active;
    await this.userRepo.save(user);

    return { jobSeeking: user.jobSeeking };
  }

  async getJobSeekingStatus(userId: string): Promise<{ jobSeeking: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return { jobSeeking: user.jobSeeking };
  }
}
