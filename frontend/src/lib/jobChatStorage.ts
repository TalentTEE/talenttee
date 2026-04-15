import { ChatMessage, JobPosting } from './types';

export interface JobChatSession {
  id: string; // local UUID
  backendSessionId?: string; // returned by backend after first message
  title: string; // first user message, truncated
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  completedJob?: JobPosting;
}

const STORAGE_KEY = 'talentee:jobChatSessions';
const MAX_TITLE_LENGTH = 60;

function read(): JobChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(sessions: JobChatSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function listSessions(): JobChatSession[] {
  return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getSession(id: string): JobChatSession | null {
  return read().find((s) => s.id === id) ?? null;
}

export function createSession(initialAgentMessage: string): JobChatSession {
  const now = new Date().toISOString();
  const session: JobChatSession = {
    id: `job-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New conversation',
    messages: [{ role: 'agent', content: initialAgentMessage }],
    createdAt: now,
    updatedAt: now,
  };
  const sessions = read();
  sessions.push(session);
  write(sessions);
  return session;
}

export function saveSession(session: JobChatSession): void {
  const sessions = read();
  const idx = sessions.findIndex((s) => s.id === session.id);
  const updated: JobChatSession = {
    ...session,
    title: deriveTitle(session),
    updatedAt: new Date().toISOString(),
  };
  if (idx === -1) sessions.push(updated);
  else sessions[idx] = updated;
  write(sessions);
}

export function deleteSession(id: string): void {
  write(read().filter((s) => s.id !== id));
}

function deriveTitle(session: JobChatSession): string {
  const firstUserMsg = session.messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New conversation';
  const text = firstUserMsg.content.trim();
  return text.length > MAX_TITLE_LENGTH
    ? text.slice(0, MAX_TITLE_LENGTH) + '…'
    : text;
}
