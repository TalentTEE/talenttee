'use client';

import { useState } from 'react';

interface JobSeekingToggleProps {
  initialActive?: boolean;
  onToggle?: (active: boolean) => void;
}

export function JobSeekingToggle({ initialActive = false, onToggle }: JobSeekingToggleProps) {
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

  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6">
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

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
            active ? 'bg-primary' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${
              active ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
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
