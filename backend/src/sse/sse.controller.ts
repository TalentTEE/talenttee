import { Controller, Sse, UseGuards, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import type { MessageEvent } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { SseService } from './sse.service.js';

@Controller('events')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('stream')
  @UseGuards(JwtGuard)
  stream(@Req() req: any): Observable<MessageEvent> {
    const userId: string = req.user.id;
    const subject = this.sseService.addClient(userId);

    // Send a connected event immediately
    setTimeout(() => {
      subject.next({ type: 'connected', data: JSON.stringify({ userId }) });
    }, 0);

    // Clean up when the client disconnects
    req.on('close', () => {
      this.sseService.removeClient(userId, subject);
    });

    return subject.asObservable().pipe(
      map((event) => event),
      finalize(() => this.sseService.removeClient(userId, subject)),
    );
  }
}
