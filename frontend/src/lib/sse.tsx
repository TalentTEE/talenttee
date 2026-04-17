'use client';

import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from './auth';

type SseEventType = 'message' | 'negotiation_complete' | 'agreement_update' | 'resume_complete';
type SseListener = (data: any) => void;

interface SseContextType {
  on: (type: SseEventType, listener: SseListener) => () => void;
}

const SseContext = createContext<SseContextType>({
  on: () => () => {},
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const RECONNECT_DELAY = 5000;

export function SseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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

      const EVENT_TYPES: SseEventType[] = ['message', 'negotiation_complete', 'agreement_update', 'resume_complete'];

      for (const type of EVENT_TYPES) {
        es.addEventListener(type, (event: MessageEvent) => {
          let data: any;
          try {
            data = JSON.parse(event.data);
          } catch {
            data = event.data;
          }

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
  }, [user]);

  return (
    <SseContext.Provider value={{ on }}>
      {children}
    </SseContext.Provider>
  );
}

export function useSse() {
  return useContext(SseContext);
}
