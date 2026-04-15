'use client';

import { useEffect, useState } from 'react';

const steps = [
  { label: 'Analyzing counter-offer', icon: 'search' },
  { label: 'Evaluating market salary data', icon: 'monitoring' },
  { label: 'Calculating optimal response', icon: 'calculate' },
  { label: 'Preparing counter-proposal', icon: 'edit_note' },
];

interface ThinkingAnimationProps {
  agentLabel: string;
}

export function ThinkingAnimation({ agentLabel }: ThinkingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl border border-border/10 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-sm font-semibold text-foreground">{agentLabel} is thinking...</span>
      </div>

      <div className="space-y-1.5 pl-1">
        {steps.map((step, i) => {
          const isComplete = i < currentStep;
          const isCurrent = i === currentStep;
          const isFuture = i > currentStep;

          return (
            <div
              key={step.label}
              className="flex items-center gap-2 animate-[thinkingStep_300ms_ease-out_both]"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <span className="text-muted-foreground/30 text-sm select-none">
                {i < steps.length - 1 ? '├─' : '└─'}
              </span>
              <span className="material-symbols-outlined text-sm text-muted-foreground/60">
                {step.icon}
              </span>
              <span className={`text-sm ${isFuture ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                {step.label}...
              </span>
              <span className="ml-auto">
                {isComplete && (
                  <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
                {isCurrent && (
                  <span className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin inline-block" />
                )}
                {isFuture && (
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/20 inline-block" />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
