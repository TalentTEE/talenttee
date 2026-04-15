'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { chatCreateJob, createJob } from '@/lib/api';
import { ChatMessage, JobPosting } from '@/lib/types';
import { formatSalary } from '@/lib/format';
import {
  JobChatSession,
  createSession,
  deleteSession,
  getSession,
  listSessions,
  saveSession,
} from '@/lib/jobChatStorage';

type Tab = 'chat' | 'form';

interface FormData {
  title: string;
  description: string;
  skills: string;
  salaryMax: string;
  remotePolicy: string;
}

const INITIAL_AGENT_GREETING =
  "Hi! I'm your AI hiring assistant. I'll help you create the perfect job posting. Let's start — what position are you looking to fill?";

export default function CreateJobPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // Chat state lifted so it survives tab switches
  const [sessions, setSessions] = useState<JobChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'EMPLOYER') router.replace('/dashboard/seeker');
  }, [user, router]);

  // Load sessions from storage once on mount
  useEffect(() => {
    const loaded = listSessions();
    setSessions(loaded);
    if (loaded.length > 0) {
      setCurrentSessionId(loaded[0].id);
    } else {
      const fresh = createSession(INITIAL_AGENT_GREETING);
      setSessions([fresh]);
      setCurrentSessionId(fresh.id);
    }
  }, []);

  const currentSession = currentSessionId
    ? sessions.find((s) => s.id === currentSessionId) ?? null
    : null;

  const refreshSessions = useCallback(() => {
    setSessions(listSessions());
  }, []);

  const handleNewSession = () => {
    const fresh = createSession(INITIAL_AGENT_GREETING);
    setSessions((prev) => [fresh, ...prev.filter((s) => s.id !== fresh.id)]);
    setCurrentSessionId(fresh.id);
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    const remaining = listSessions();
    setSessions(remaining);
    if (currentSessionId === id) {
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
      } else {
        const fresh = createSession(INITIAL_AGENT_GREETING);
        setSessions([fresh]);
        setCurrentSessionId(fresh.id);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Create Job Posting
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          Use the AI assistant or fill in the form manually
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-accent w-fit">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
            activeTab === 'chat'
              ? 'bg-[#FFE600] text-[#0a0a0a]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="material-symbols-outlined text-lg">chat</span>
          AI Chat Mode
        </button>
        <button
          onClick={() => setActiveTab('form')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
            activeTab === 'form'
              ? 'bg-[#FFE600] text-[#0a0a0a]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="material-symbols-outlined text-lg">edit_note</span>
          Form Mode
        </button>
      </div>

      {activeTab === 'chat' ? (
        <div className="grid grid-cols-[260px_1fr] gap-4">
          <ChatSidebar
            sessions={sessions}
            currentId={currentSessionId}
            onSelect={handleSelectSession}
            onNew={handleNewSession}
            onDelete={handleDeleteSession}
          />
          {currentSession && (
            <ChatMode
              key={currentSession.id}
              session={currentSession}
              onSessionUpdated={refreshSessions}
            />
          )}
        </div>
      ) : (
        <div className="max-w-3xl">
          <FormMode />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Chat Sidebar ─────────────────────────── */

function ChatSidebar({
  sessions,
  currentId,
  onSelect,
  onNew,
  onDelete,
}: {
  sessions: JobChatSession[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/10 bg-card overflow-hidden flex flex-col h-[560px]">
      <div className="p-3 border-b border-border/10">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 justify-center px-3 py-2 rounded-lg bg-[#FFE600] text-[#0a0a0a] text-sm font-semibold hover:bg-[#FFE600]/90 transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          New Chat
        </button>
      </div>
      <div data-lenis-prevent className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-xs text-muted-foreground p-3 text-center">
            No conversations yet
          </p>
        )}
        {sessions.map((s) => {
          const isActive = s.id === currentId;
          return (
            <div
              key={s.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                isActive
                  ? 'bg-[#FFE600]/10 text-foreground'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onSelect(s.id)}
            >
              <span
                className={`material-symbols-outlined text-base ${
                  isActive ? 'text-[#FFE600]' : ''
                }`}
              >
                {s.completedJob ? 'task_alt' : 'forum'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeTime(s.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this conversation?')) onDelete(s.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                title="Delete"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ─────────────────────────── Chat Mode ─────────────────────────── */

function ChatMode({
  session,
  onSessionUpdated,
}: {
  session: JobChatSession;
  onSessionUpdated: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(session.messages);
  const [backendSessionId, setBackendSessionId] = useState<string | undefined>(
    session.backendSessionId,
  );
  const [createdJob, setCreatedJob] = useState<JobPosting | null>(
    session.completedJob ?? null,
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Smart auto-scroll: only snap to bottom if user was already near the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !shouldAutoScrollRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  };

  // Persist to storage whenever key state changes
  useEffect(() => {
    const persisted = getSession(session.id);
    if (!persisted) return;
    saveSession({
      ...persisted,
      messages,
      backendSessionId,
      completedJob: createdJob ?? undefined,
    });
    onSessionUpdated();
  }, [messages, backendSessionId, createdJob, session.id, onSessionUpdated]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || createdJob) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    shouldAutoScrollRef.current = true;

    try {
      const { sessionId, response } = await chatCreateJob(
        updatedMessages,
        backendSessionId,
      );
      setBackendSessionId(sessionId);

      if (response.complete && response.jobPosting) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'agent',
            content:
              "I've gathered enough information to create your job posting. Here's a preview:",
          },
        ]);
        setCreatedJob(response.jobPosting);
      } else if (response.question) {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: response.question! },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: 'Sorry, something went wrong. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-4">
      {/* Chat Window */}
      <div className="rounded-2xl border border-border/10 bg-card overflow-hidden flex flex-col h-[560px] min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          data-lenis-prevent
          className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start gap-3 max-w-[80%] ${
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'agent'
                      ? 'bg-[#FFE600]/15 text-[#FFE600]'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {msg.role === 'agent' ? 'smart_toy' : 'person'}
                  </span>
                </div>
                {/* Bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl text-base leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#FFE600] text-[#0a0a0a] rounded-br-md'
                      : 'bg-accent text-foreground rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base">smart_toy</span>
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-accent text-muted-foreground text-base">
                  <span className="flex gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-border/10 p-4 bg-accent/30">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={createdJob ? 'Job posting ready — start a new chat to create another' : 'Type your answer...'}
              disabled={isLoading || !!createdJob}
              className="flex-1 bg-muted rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#FFE600]/30 transition-all disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !!createdJob}
              className="px-4 py-3 rounded-xl bg-[#FFE600] text-[#0a0a0a] text-base font-semibold hover:bg-[#FFE600]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">send</span>
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Job Preview Card */}
      {createdJob && <JobPreviewCard job={createdJob} />}
    </div>
  );
}

/* ─────────────────────────── Form Mode ─────────────────────────── */

function FormMode() {
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    skills: '',
    salaryMax: '',
    remotePolicy: 'office',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createJob({
        title: form.title,
        description: form.description,
        requiredSkills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        salaryMin: 0,
        salaryMax: Number(form.salaryMax),
        remotePolicy: form.remotePolicy,
      });
      setSubmitted(true);
    } catch {
      alert('Failed to create job posting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border/10 bg-card p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#FFE600]/15 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-[#FFE600] text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <h2 className="font-[var(--font-manrope)] text-xl font-bold text-foreground">
          Job Posting Created!
        </h2>
        <p className="text-base text-muted-foreground">
          Your job posting has been submitted and is now active.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ title: '', description: '', skills: '', salaryMax: '', remotePolicy: 'office' });
          }}
          className="px-6 py-2.5 rounded-xl bg-[#FFE600] text-[#0a0a0a] text-base font-semibold hover:bg-[#FFE600]/90 transition-all"
        >
          Create Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border/10 bg-card p-6 space-y-5">
      {/* Title */}
      <div className="space-y-2">
        <label className="text-base font-medium text-foreground">Job Title</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          placeholder="e.g. Senior Backend Developer"
          className="w-full bg-muted rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#FFE600]/30 transition-all"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-base font-medium text-foreground">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
          rows={4}
          placeholder="Describe the role, responsibilities, and team..."
          className="w-full bg-muted rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#FFE600]/30 transition-all resize-none"
        />
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <label className="text-base font-medium text-foreground">Required Skills</label>
        <input
          type="text"
          name="skills"
          value={form.skills}
          onChange={handleChange}
          required
          placeholder="TypeScript, React, Node.js (comma-separated)"
          className="w-full bg-muted rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#FFE600]/30 transition-all"
        />
        {form.skills && (
          <div className="flex flex-wrap gap-2 pt-1">
            {form.skills.split(',').map((skill, i) => {
              const trimmed = skill.trim();
              if (!trimmed) return null;
              return (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-[#FFE600]/10 text-[#FFE600] text-sm font-medium"
                >
                  {trimmed}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Maximum Salary Budget */}
      <div className="space-y-2">
        <label className="text-base font-medium text-foreground">
          Maximum Salary Budget <span className="text-[#FFE600] text-sm font-medium">(Negotiation Ceiling)</span>
        </label>
        <span className="block text-sm text-muted-foreground">AI will negotiate up to this amount on your behalf. Candidates won't see this number.</span>
        <input
          type="number"
          name="salaryMax"
          value={form.salaryMax}
          onChange={handleChange}
          required
          placeholder="e.g. 80,000,000 KRW/year"
          className="w-full bg-muted rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#FFE600]/30 transition-all"
        />
      </div>

      {/* Remote Policy */}
      <div className="space-y-2">
        <label className="text-base font-medium text-foreground">Remote Policy</label>
        <select
          name="remotePolicy"
          value={form.remotePolicy}
          onChange={handleChange}
          className="w-full bg-muted rounded-xl px-4 py-3 text-base text-foreground outline-none focus:ring-2 focus:ring-[#FFE600]/30 transition-all appearance-none cursor-pointer"
        >
          <option value="office">Full Office</option>
          <option value="hybrid-3">Hybrid (3 days office)</option>
          <option value="hybrid-2">Hybrid (2 days office)</option>
          <option value="remote">Full Remote</option>
        </select>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-[#FFE600] text-[#0a0a0a] text-base font-semibold hover:bg-[#FFE600]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              Creating...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Create Job Posting
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────── Job Preview Card ─────────────────────────── */

function JobPreviewCard({ job }: { job: JobPosting }) {

  return (
    <div className="rounded-2xl border border-[#FFE600]/20 bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFE600]/15 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-[#FFE600] text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            work
          </span>
        </div>
        <div>
          <h3 className="font-[var(--font-manrope)] text-lg font-bold text-foreground">
            {job.title}
          </h3>
          <p className="text-sm text-muted-foreground">Job Preview</p>
        </div>
        <span className="ml-auto px-3 py-1 rounded-full bg-[#FFE600]/10 text-[#FFE600] text-sm font-semibold">
          {job.status}
        </span>
      </div>

      <p className="text-base text-muted-foreground leading-relaxed">{job.description}</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Required Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSkills.map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-md bg-[#FFE600]/10 text-[#FFE600] text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Max Salary Budget</p>
          <p className="text-base font-semibold text-foreground">
            Up to {formatSalary(job.salaryMax)}
          </p>
        </div>
      </div>

      {job.remotePolicy && (
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          <span className="material-symbols-outlined text-base">location_on</span>
          {job.remotePolicy}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button className="flex-1 py-2.5 rounded-xl bg-[#FFE600] text-[#0a0a0a] text-base font-semibold hover:bg-[#FFE600]/90 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-lg">check</span>
          Publish Job
        </button>
        <button className="px-6 py-2.5 rounded-xl bg-accent text-foreground text-base font-medium hover:bg-accent/80 transition-all">
          Edit
        </button>
      </div>
    </div>
  );
}
