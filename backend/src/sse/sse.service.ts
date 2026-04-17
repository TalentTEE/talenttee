import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject } from 'rxjs';
import { SSE_EVENTS } from '../common/events/sse.events.js';
import type {
  SseNewMessageEvent,
  SseNegotiationCompleteEvent,
  SseAgreementUpdateEvent,
  SseResumeCompleteEvent,
} from '../common/events/sse.events.js';

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly clients = new Map<string, Subject<MessageEvent>[]>();

  /** Register a new client stream for a user. Returns Subject to pipe to SSE. */
  addClient(userId: string): Subject<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    const existing = this.clients.get(userId) ?? [];
    existing.push(subject);
    this.clients.set(userId, existing);
    this.logger.log(`SSE client connected: ${userId} (${existing.length} total)`);
    return subject;
  }

  /** Remove a client stream when the connection closes. */
  removeClient(userId: string, subject: Subject<MessageEvent>): void {
    const existing = this.clients.get(userId);
    if (!existing) return;
    const filtered = existing.filter((s) => s !== subject);
    if (filtered.length === 0) {
      this.clients.delete(userId);
    } else {
      this.clients.set(userId, filtered);
    }
    subject.complete();
    this.logger.log(`SSE client disconnected: ${userId} (${filtered.length} remaining)`);
  }

  /** Push an event to all streams for a given user. */
  private pushToUser(userId: string, event: MessageEvent): void {
    const streams = this.clients.get(userId);
    if (!streams || streams.length === 0) return;
    for (const s of streams) {
      s.next(event);
    }
  }

  @OnEvent(SSE_EVENTS.NEW_MESSAGE)
  onNewMessage(event: SseNewMessageEvent): void {
    this.pushToUser(event.recipientUserId, {
      type: 'message',
      data: JSON.stringify({
        sessionId: event.sessionId,
        senderId: event.senderId,
        preview: event.preview,
      }),
    });
  }

  @OnEvent(SSE_EVENTS.NEGOTIATION_COMPLETE)
  onNegotiationComplete(event: SseNegotiationCompleteEvent): void {
    this.pushToUser(event.recipientUserId, {
      type: 'negotiation_complete',
      data: JSON.stringify({ sessionId: event.sessionId }),
    });
  }

  @OnEvent(SSE_EVENTS.AGREEMENT_UPDATE)
  onAgreementUpdate(event: SseAgreementUpdateEvent): void {
    this.pushToUser(event.recipientUserId, {
      type: 'agreement_update',
      data: JSON.stringify({
        sessionId: event.sessionId,
        action: event.action,
        byRole: event.byRole,
      }),
    });
  }

  @OnEvent(SSE_EVENTS.RESUME_COMPLETE)
  onResumeComplete(event: SseResumeCompleteEvent): void {
    this.pushToUser(event.recipientUserId, {
      type: 'resume_complete',
      data: JSON.stringify({}),
    });
  }
}
