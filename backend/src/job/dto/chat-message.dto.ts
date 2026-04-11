import { IsString, IsOptional } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
