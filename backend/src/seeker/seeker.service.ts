import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '../entities/user.entity.js';
import { MATCH_EVENTS } from '../common/events/match.events.js';

@Injectable()
export class SeekerService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async updateJobSeekingStatus(userId: string, active: boolean): Promise<{ jobSeeking: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.jobSeeking = active;
    await this.userRepo.save(user);

    if (active) {
      this.eventEmitter.emit(MATCH_EVENTS.JOB_SEEKING_ON, { seekerId: userId });
    }

    return { jobSeeking: user.jobSeeking };
  }

  async getJobSeekingStatus(userId: string): Promise<{ jobSeeking: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return { jobSeeking: user.jobSeeking };
  }
}
