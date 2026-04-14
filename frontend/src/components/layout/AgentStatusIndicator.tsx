'use client';

import type { AgentState } from '@/hooks/useAgentStatus';

interface AgentStatusIndicatorProps {
  state: AgentState;
  message: string;
  onClick?: () => void;
}

const stateConfig: Record<AgentState, { color: string; dotClass: string; ringClass?: string }> = {
  idle: {
    color: 'bg-muted-foreground/40',
    dotClass: 'animate-[pulse_3s_ease-in-out_infinite]',
  },
  analyzing: {
    color: 'bg-[#00E5FF]',
    dotClass: 'animate-[pulse_1s_ease-in-out_infinite]',
    ringClass: 'animate-spin',
  },
  negotiating: {
    color: 'bg-[#FF2DF1]',
    dotClass: 'animate-[pulse_2s_ease-in-out_infinite]',
  },
  waiting: {
    color: 'bg-[#39FF14]',
    dotClass: '',
  },
};

export function AgentStatusIndicator({ state, message, onClick }: AgentStatusIndicatorProps) {
  const config = stateConfig[state];

  return (
    <button
      onClick={onClick}
      className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-accent/50 transition-all cursor-pointer group"
    >
      {/* Animated Dot */}
      <span className="relative flex items-center justify-center w-5 h-5">
        {/* Outer ring for analyzing state */}
        {config.ringClass && (
          <span
            className={`absolute inset-0 rounded-full border-2 border-[#00E5FF]/30 border-t-[#00E5FF] ${config.ringClass}`}
          />
        )}
        {/* Glow for waiting state */}
        {state === 'waiting' && (
          <span className="absolute inset-0 rounded-full bg-[#39FF14]/20 animate-[pulse_2s_ease-in-out_infinite]" />
        )}
        {/* Core dot */}
        <span
          className={`relative w-2 h-2 rounded-full ${config.color} ${config.dotClass}`}
        />
      </span>

      {/* Text */}
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors max-w-[180px] truncate">
        {message}
      </span>
    </button>
  );
}
