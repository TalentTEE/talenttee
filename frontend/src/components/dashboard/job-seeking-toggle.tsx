'use client';

import { useState } from 'react';

interface JobSeekingToggleProps {
  initialActive?: boolean;
  onToggle?: (active: boolean) => void;
  compact?: boolean;
}

export function JobSeekingToggle({ initialActive = false, onToggle, compact = false }: JobSeekingToggleProps) {
  const [active, setActive] = useState(initialActive);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = () => {
    if (!active) {
      setShowConfirm(true);
      return;
    }
    setActive(false);
    onToggle?.(false);
  };

  const confirmActivate = () => {
    setActive(true);
    setShowConfirm(false);
    onToggle?.(true);
  };

  const toggleSwitch = (
    <button
      onClick={handleToggle}
      className={`relative w-12 h-7 rounded-full transition-colors duration-300 shrink-0 ${
        active ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${
          active ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  if (compact) {
    return (
      <div data-testid="job-seeking-toggle">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-muted-foreground">Job Seek Mode</p>
          {toggleSwitch}
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-start gap-2 mb-2">
              <span className="material-symbols-outlined text-sm text-primary mt-0.5">info</span>
              <p className="text-sm text-foreground leading-relaxed">
                AI will automatically match you with jobs and <strong>negotiate on your behalf</strong>.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmActivate}
                className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Activate
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl" data-testid="job-seeking-toggle">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            active ? 'bg-primary/10' : 'bg-muted'
          }`}>
            <span
              className={`material-symbols-outlined text-xl ${active ? 'text-primary' : 'text-muted-foreground'}`}
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              work
            </span>
          </div>
          <div>
            <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">
              Job Seeking
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {active
                ? 'Active — AI is matching and negotiating on your behalf'
                : 'Inactive — your profile is hidden from employers'}
            </p>
          </div>
        </div>

        {toggleSwitch}
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-2 mb-3">
            <span className="material-symbols-outlined text-base text-primary mt-0.5">info</span>
            <p className="text-base text-foreground leading-relaxed">
              When you turn on Job Seeking, AI will automatically match you with jobs and <strong>negotiate on your behalf</strong>.
              You can intervene at any time or approve/reject the final agreement.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 rounded-lg text-base text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmActivate}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90 transition-all"
            >
              Activate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
