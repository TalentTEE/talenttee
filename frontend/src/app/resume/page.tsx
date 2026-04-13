'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getResume, generateResume, getResumeStatus, USE_DUMMY } from '@/lib/api';
import { ResumeProfile } from '@/lib/types';

const STEPS = [
  { key: 'COLLECTING', label: 'Collecting', icon: 'cloud_download' },
  { key: 'ANALYZING', label: 'Analyzing', icon: 'psychology' },
  { key: 'COMPLETE', label: 'Complete', icon: 'check_circle' },
] as const;

function stepIndex(status: ResumeProfile['status']): number {
  return STEPS.findIndex((s) => s.key === status);
}

function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return `$${value.toLocaleString()}`;
}

export default function ResumePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'SEEKER') router.replace('/dashboard/employer');
  }, [user, router]);
  const [simulatedStatus, setSimulatedStatus] =
    useState<ResumeProfile['status'] | null>(null);

  useEffect(() => {
    if (!user) return;
    getResume()
      .then(setResume)
      .catch(() => setResume(null))
      .finally(() => setLoading(false));
  }, [user]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setSimulatedStatus('COLLECTING');

    if (USE_DUMMY) {
      setTimeout(() => setSimulatedStatus('ANALYZING'), 1500);
      setTimeout(() => {
        setSimulatedStatus('COMPLETE');
        if (user) {
          getResume()
            .then((data) => {
              setResume(data);
              setGenerating(false);
              setSimulatedStatus(null);
            })
            .catch(() => {
              setGenerating(false);
              setSimulatedStatus(null);
            });
        }
      }, 3000);
      return;
    }

    try {
      const { resumeId } = await generateResume();
      const pollInterval = setInterval(async () => {
        try {
          const { status: currentStatus } = await getResumeStatus();
          setSimulatedStatus(currentStatus as ResumeProfile['status']);

          if (currentStatus === 'COMPLETE') {
            clearInterval(pollInterval);
            if (user) {
              const fullResume = await getResume();
              setResume(fullResume);
            }
            setGenerating(false);
            setSimulatedStatus(null);
          }
        } catch {
          clearInterval(pollInterval);
          setGenerating(false);
          setSimulatedStatus(null);
        }
      }, 2000);
    } catch {
      setGenerating(false);
      setSimulatedStatus(null);
    }
  }, [user]);

  const currentStatus = simulatedStatus || resume?.status;
  const currentStepIdx = currentStatus ? stepIndex(currentStatus) : -1;
  const isComplete = currentStatus === 'COMPLETE' && resume && !generating;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            AI Resume
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated professional profile based on your connected data
            sources.
          </p>
        </div>
        {(!resume || resume.status !== 'COMPLETE') && !generating && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">
              auto_awesome
            </span>
            Generate Resume
          </button>
        )}
      </div>

      {/* Progress Section */}
      <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6">
        <h2 className="font-[var(--font-manrope)] font-bold text-foreground mb-6">
          Generation Progress
        </h2>
        <div className="flex items-center gap-0">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStepIdx;
            const isDone =
              idx < currentStepIdx ||
              (idx === currentStepIdx &&
                currentStatus === 'COMPLETE' &&
                !generating);
            const isPending = idx > currentStepIdx || currentStepIdx === -1;

            return (
              <div
                key={step.key}
                className="flex items-center flex-1 last:flex-none"
              >
                {/* Step node */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-[#262626] text-muted-foreground/40'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-2xl ${
                        isActive && generating ? 'animate-pulse' : ''
                      }`}
                      style={
                        isDone || isActive
                          ? { fontVariationSettings: "'FILL' 1" }
                          : undefined
                      }
                    >
                      {isDone ? 'check_circle' : step.icon}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isDone
                        ? 'text-emerald-400'
                        : isActive
                          ? 'text-primary'
                          : 'text-muted-foreground/40'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 h-0.5 rounded-full overflow-hidden bg-[#262626]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx < currentStepIdx
                          ? 'w-full bg-emerald-500'
                          : idx === currentStepIdx && generating
                            ? 'w-1/2 bg-primary animate-pulse'
                            : 'w-0 bg-primary'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status message */}
        {generating && (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="material-symbols-outlined text-base text-primary animate-spin">
              progress_activity
            </span>
            {currentStatus === 'COLLECTING'
              ? 'Collecting data from connected sources...'
              : currentStatus === 'ANALYZING'
                ? 'AI is analyzing your professional profile...'
                : 'Finalizing your resume...'}
          </div>
        )}

        {!generating && !resume && !loading && (
          <div className="mt-6 text-sm text-muted-foreground">
            Connect your data sources and click &quot;Generate Resume&quot; to
            get started.
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/10 bg-[#1a1919] p-6 h-40 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Resume Content - shown only when complete */}
      {isComplete && resume && (
        <div className="space-y-6">
          {/* AI Summary */}
          <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="material-symbols-outlined text-lg text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              <h2 className="font-[var(--font-manrope)] font-bold text-foreground">
                AI Summary
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {resume.summary}
            </p>
          </div>

          {/* Market Value */}
          <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="material-symbols-outlined text-lg text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                trending_up
              </span>
              <h2 className="font-[var(--font-manrope)] font-bold text-foreground">
                Estimated Market Value
              </h2>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-[var(--font-manrope)] text-3xl font-extrabold text-primary">
                {formatCurrency(resume.marketValueMin)} -{' '}
                {formatCurrency(resume.marketValueMax)}
              </span>
              <span className="text-sm text-muted-foreground">/ year</span>
            </div>
            {resume.marketValueReasoning && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {resume.marketValueReasoning}
              </p>
            )}
          </div>

          {/* Skills */}
          <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="material-symbols-outlined text-lg text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                code
              </span>
              <h2 className="font-[var(--font-manrope)] font-bold text-foreground">
                Skills
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium border border-primary/20"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6">
            <div className="flex items-center gap-2 mb-6">
              <span
                className="material-symbols-outlined text-lg text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                work
              </span>
              <h2 className="font-[var(--font-manrope)] font-bold text-foreground">
                Experience
              </h2>
            </div>
            <div className="space-y-0">
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="relative flex gap-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary border-2 border-[#1a1919] z-10" />
                    {idx < resume.experience.length - 1 && (
                      <div className="w-0.5 flex-1 bg-[#262626]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-8 last:pb-0 flex-1">
                    <h3 className="font-[var(--font-manrope)] font-bold text-foreground text-sm">
                      {exp.role}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 mb-2">
                      <span className="text-sm text-muted-foreground">
                        {exp.company}
                      </span>
                      <span className="text-muted-foreground/30">|</span>
                      <span className="text-xs text-muted-foreground/60">
                        {exp.period}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {exp.highlights.map((highlight, hIdx) => (
                        <li
                          key={hIdx}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="text-primary/40 mt-1 text-xs">
                            &#9679;
                          </span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="material-symbols-outlined text-lg text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                school
              </span>
              <h2 className="font-[var(--font-manrope)] font-bold text-foreground">
                Education
              </h2>
            </div>
            <div className="space-y-3">
              {resume.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#201f1f]"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {edu.degree}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {edu.institution}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground/60 font-medium">
                    {edu.year}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Improvement Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="material-symbols-outlined text-lg text-emerald-400"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  thumb_up
                </span>
                <h2 className="font-[var(--font-manrope)] font-bold text-foreground">
                  Strengths
                </h2>
              </div>
              <ul className="space-y-2">
                {resume.strengths.map((s, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-emerald-400 mt-0.5">
                      <span className="material-symbols-outlined text-sm">
                        check
                      </span>
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvement Areas */}
            <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="material-symbols-outlined text-lg text-amber-400"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lightbulb
                </span>
                <h2 className="font-[var(--font-manrope)] font-bold text-foreground">
                  Areas to Improve
                </h2>
              </div>
              <ul className="space-y-2">
                {resume.improvementAreas.map((area, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-amber-400 mt-0.5">
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward
                      </span>
                    </span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Negotiation Points */}
          {resume.negotiationPoints && (
            <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="material-symbols-outlined text-lg text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  handshake
                </span>
                <h2 className="font-[var(--font-manrope)] font-bold text-foreground">
                  Negotiation Points
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                    Leverage Points
                  </h3>
                  <ul className="space-y-2">
                    {resume.negotiationPoints.strengths.map((s, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-emerald-400 mt-0.5">
                          <span className="material-symbols-outlined text-sm">
                            add_circle
                          </span>
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
                    Watch Out For
                  </h3>
                  <ul className="space-y-2">
                    {resume.negotiationPoints.weaknesses.map((w, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-amber-400 mt-0.5">
                          <span className="material-symbols-outlined text-sm">
                            warning
                          </span>
                        </span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
