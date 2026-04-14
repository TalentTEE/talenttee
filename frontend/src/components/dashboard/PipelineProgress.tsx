'use client';

import { cn } from '@/lib/utils';

export type PipelineStage = 'connect' | 'analyze' | 'match' | 'negotiate' | 'agree';

const stages: { key: PipelineStage; label: string; icon: string; color: string }[] = [
  { key: 'connect', label: 'Connect', icon: 'link', color: '#00F0FF' },
  { key: 'analyze', label: 'Analyze', icon: 'analytics', color: '#BF5AF2' },
  { key: 'match', label: 'Match', icon: 'groups', color: '#39FF14' },
  { key: 'negotiate', label: 'Negotiate', icon: 'handshake', color: '#FF2DF1' },
  { key: 'agree', label: 'Agree', icon: 'task_alt', color: '#FFE600' },
];

interface PipelineProgressProps {
  currentStage: PipelineStage;
}

export function PipelineProgress({ currentStage }: PipelineProgressProps) {
  const currentIndex = stages.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex items-center gap-1 w-full">
      {stages.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-0">
            {/* Stage node */}
            <div className="flex flex-col items-center gap-1 min-w-[48px]">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500',
                  isFuture && 'bg-muted border border-border/20',
                )}
                style={
                  isComplete
                    ? { backgroundColor: stage.color, color: '#0a0a0a' }
                    : isCurrent
                    ? { backgroundColor: `color-mix(in srgb, ${stage.color} 20%, transparent)`, borderWidth: 2, borderColor: stage.color, borderStyle: 'solid' }
                    : undefined
                }
              >
                {isComplete ? (
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                ) : (
                  <span
                    className={cn(
                      'material-symbols-outlined text-sm',
                      isCurrent && 'animate-pulse',
                      isFuture && 'text-muted-foreground/40',
                    )}
                    style={isCurrent ? { color: stage.color } : undefined}
                  >
                    {stage.icon}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  isCurrent && 'font-semibold',
                  isFuture && 'text-muted-foreground/40',
                )}
                style={isComplete || isCurrent ? { color: stage.color } : undefined}
              >
                {stage.label}
              </span>
            </div>
            {/* Connector line */}
            {i < stages.length - 1 && (
              <div className="flex-1 h-px mx-1">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    i >= currentIndex && 'bg-border/20',
                  )}
                  style={i < currentIndex ? { backgroundColor: stages[i + 1].color } : undefined}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
