import { IsString } from 'class-validator';

export class InterveneDto {
  @IsString()
  direction: string;
}
