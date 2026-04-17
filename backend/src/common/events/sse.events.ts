export const SSE_EVENTS = {
  NEW_MESSAGE: 'sse.new_message',
  MATCH_FOUND: 'sse.match_found',
  NEGOTIATION_COMPLETE: 'sse.negotiation_complete',
  AGREEMENT_UPDATE: 'sse.agreement_update',
  RESUME_COMPLETE: 'sse.resume_complete',
} as const;

export interface SseNewMessageEvent {
  recipientUserId: string;
  sessionId: string;
  senderId: string;
  preview: string;
}

export interface SseMatchFoundEvent {
  recipientUserId: string;
  jobTitle: string;
}

export interface SseNegotiationCompleteEvent {
  recipientUserId: string;
  sessionId: string;
}

export interface SseAgreementUpdateEvent {
  recipientUserId: string;
  sessionId: string;
  action: 'approved' | 'rejected';
  byRole: 'seeker' | 'employer';
}

export interface SseResumeCompleteEvent {
  recipientUserId: string;
}
