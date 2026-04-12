import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  jobId: string;

  @IsString()
  seekerId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxRounds?: number;
}
