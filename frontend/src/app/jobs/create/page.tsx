'use client';

import { useState, useRef, useEffect } from 'react';
import { chatCreateJob, createJob } from '@/lib/api';
import { ChatMessage, JobPosting, JobChatResponse } from '@/lib/types';

type Tab = 'chat' | 'form';

interface FormData {
  title: string;
  description: string;
  skills: string;
  salaryMin: string;
  salaryMax: string;
  remotePolicy: string;
}

export default function CreateJobPage() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Create Job Posting
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Use the AI assistant or fill in the form manually
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-accent w-fit">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'chat'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="material-symbols-outlined text-lg">chat</span>
          Chat Mode
        </button>
        <button
          onClick={() => setActiveTab('form')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'form'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="material-symbols-outlined text-lg">edit_note</span>
          Form Mode
        </button>
      </div>

      {activeTab === 'chat' ? <ChatMode /> : <FormMode />}
    </div>
  );
}

/* ─────────────────────────── Chat Mode ─────────────────────────── */

function ChatMode() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      content:
        "Hi! I'm your AI hiring assistant. I'll help you create the perfect job posting. Let's start \u2014 what position are you looking to fill?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdJob, setCreatedJob] = useState<JobPosting | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response: JobChatResponse = await chatCreateJob(updatedMessages);

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
      <div className="rounded-2xl border border-border/10 bg-card overflow-hidden">
        <div
          ref={scrollRef}
          className="h-[420px] overflow-y-auto p-6 space-y-4"
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
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {msg.role === 'agent' ? 'smart_toy' : 'person'}
                  </span>
                </div>
                {/* Bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
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
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-accent text-muted-foreground text-sm">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
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
              placeholder="Type your answer..."
              disabled={isLoading || !!createdJob}
              className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !!createdJob}
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
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
    salaryMin: '',
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
        salaryMin: Number(form.salaryMin),
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
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-primary text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <h2 className="font-[var(--font-manrope)] text-xl font-bold text-foreground">
          Job Posting Created!
        </h2>
        <p className="text-sm text-muted-foreground">
          Your job posting has been submitted and is now active.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ title: '', description: '', skills: '', salaryMin: '', salaryMax: '', remotePolicy: 'office' });
          }}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
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
        <label className="text-sm font-medium text-foreground">Job Title</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          placeholder="e.g. Senior Backend Developer"
          className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
          rows={4}
          placeholder="Describe the role, responsibilities, and team..."
          className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
        />
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Required Skills</label>
        <input
          type="text"
          name="skills"
          value={form.skills}
          onChange={handleChange}
          required
          placeholder="TypeScript, React, Node.js (comma-separated)"
          className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        {form.skills && (
          <div className="flex flex-wrap gap-2 pt-1">
            {form.skills.split(',').map((skill, i) => {
              const trimmed = skill.trim();
              if (!trimmed) return null;
              return (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium"
                >
                  {trimmed}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Salary Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Salary Range (KRW / year)</label>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            name="salaryMin"
            value={form.salaryMin}
            onChange={handleChange}
            required
            placeholder="Minimum"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <input
            type="number"
            name="salaryMax"
            value={form.salaryMax}
            onChange={handleChange}
            required
            placeholder="Maximum"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Remote Policy */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Remote Policy</label>
        <select
          name="remotePolicy"
          value={form.remotePolicy}
          onChange={handleChange}
          className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none cursor-pointer"
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
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
  const formatSalary = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}\ub9cc`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-primary text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            work
          </span>
        </div>
        <div>
          <h3 className="font-[var(--font-manrope)] text-lg font-bold text-foreground">
            {job.title}
          </h3>
          <p className="text-xs text-muted-foreground">Job Preview</p>
        </div>
        <span className="ml-auto px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          {job.status}
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Required Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSkills.map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Salary Range</p>
          <p className="text-sm font-semibold text-foreground">
            {formatSalary(job.salaryMin)} ~ {formatSalary(job.salaryMax)} KRW
          </p>
        </div>
      </div>

      {job.remotePolicy && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="material-symbols-outlined text-base">location_on</span>
          {job.remotePolicy}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-lg">check</span>
          Publish Job
        </button>
        <button className="px-6 py-2.5 rounded-xl bg-accent text-foreground text-sm font-medium hover:bg-accent/80 transition-all">
          Edit
        </button>
      </div>
    </div>
  );
}
