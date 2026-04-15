import { IsBoolean } from 'class-validator';

export class UpdateJobSeekingStatusDto {
  @IsBoolean()
  active: boolean;
}
