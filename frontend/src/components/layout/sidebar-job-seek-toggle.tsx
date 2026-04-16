'use client';

import { useEffect, useState } from 'react';
import { getJobSeekingStatus, updateJobSeekingStatus } from '@/lib/api';

export function SidebarJobSeekToggle() {
  const [active, setActive] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getJobSeekingStatus()
      .then((s) => setActive(s.jobSeeking))
      .catch(() => {});
  }, []);

  const handleToggle = async () => {
    if (!active) {
      setShowConfirm(true);
      return;
    }
    setActive(false);
    await updateJobSeekingStatus(false);
  };

  const confirmActivate = async () => {
    setActive(true);
    setShowConfirm(false);
    await updateJobSeekingStatus(true);
  };

  return (
    <div className="mt-auto border-t border-border/10 pt-3 pb-1" data-testid="job-seeking-toggle">
      <div className="px-3 py-2.5">
        {showConfirm && (
          <div className="mb-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-foreground leading-relaxed mb-2">
              AI will match you with jobs and <strong>negotiate on your behalf</strong>.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmActivate}
                className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
              >
                Activate
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Job Seek Mode</span>
          <button
            onClick={handleToggle}
            className={`relative w-10 h-6 rounded-full transition-colors duration-300 shrink-0 ${
              active ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                active ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
