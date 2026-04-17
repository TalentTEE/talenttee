'use client';

import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from './auth';
import { useToast } from '@/components/ui/toast-provider';

type SseEventType = 'message' | 'match_found' | 'negotiation_complete' | 'agreement_update' | 'resume_complete';
type SseListener = (data: any) => void;

interface SseContextType {
  on: (type: SseEventType, listener: SseListener) => () => void;
}

const SseContext = createContext<SseContextType>({
  on: () => () => {},
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const RECONNECT_DELAY = 5000;

const TOAST_MESSAGES: Partial<Record<SseEventType, (data: any) => { message: string; type: 'info' | 'success' }>> = {
  message: (d) => ({ message: `New message: "${d.preview?.slice(0, 50) || '...'}"`, type: 'info' }),
  match_found: (d) => ({ message: `New match found: ${d.jobTitle || 'New position'}`, type: 'success' }),
  negotiation_complete: () => ({ message: 'Negotiation completed!', type: 'success' }),
  agreement_update: (d) => ({
    message: d.action === 'approved'
      ? `The ${d.byRole} has approved the agreement`
      : `The ${d.byRole} has rejected the agreement`,
    type: d.action === 'approved' ? 'info' : 'warning' as any,
  }),
  resume_complete: () => ({ message: 'Your resume has been generated!', type: 'success' }),
};

export function SseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const listenersRef = useRef<Map<SseEventType, Set<SseListener>>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const on = useCallback((type: SseEventType, listener: SseListener) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(listener);
    return () => {
      listenersRef.current.get(type)?.delete(listener);
    };
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    if (!user || !token) {
      // Close any existing connection when logged out
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`${API_URL}/events/stream?token=${encodeURIComponent(token!)}`);
      eventSourceRef.current = es;

      const EVENT_TYPES: SseEventType[] = ['message', 'match_found', 'negotiation_complete', 'agreement_update', 'resume_complete'];

      for (const type of EVENT_TYPES) {
        es.addEventListener(type, (event: MessageEvent) => {
          let data: any;
          try {
            data = JSON.parse(event.data);
          } catch {
            data = event.data;
          }

          // Show toast
          const toastFn = TOAST_MESSAGES[type];
          if (toastFn) {
            const { message, type: toastType } = toastFn(data);
            addToast(message, toastType);
          }

          // Dispatch to registered listeners
          const listeners = listenersRef.current.get(type);
          if (listeners) {
            for (const listener of listeners) {
              listener(data);
            }
          }
        });
      }

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        // Reconnect after delay
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
      };
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user, addToast]);

  return (
    <SseContext.Provider value={{ on }}>
      {children}
    </SseContext.Provider>
  );
}

export function useSse() {
  return useContext(SseContext);
}
