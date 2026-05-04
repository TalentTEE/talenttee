'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getGithubOAuthUrl, getGithubRepos, saveSelectedRepos } from '@/lib/api';
import type { GitHubRepo } from '@/lib/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface GitHubConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
  useDummy: boolean;
  mode?: 'connect' | 'manage';
}

type Step = 'intro' | 'waiting' | 'repos' | 'done' | 'error';
const REPO_PAGE_SIZE = 8;

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-yellow-400',
  Rust: 'bg-orange-500',
  Python: 'bg-green-500',
  Shell: 'bg-emerald-600',
  Go: 'bg-cyan-500',
  Java: 'bg-red-500',
  Ruby: 'bg-red-400',
  C: 'bg-gray-500',
  'C++': 'bg-pink-500',
};

export function GitHubConnectDialog({ open, onOpenChange, onConnected, useDummy, mode = 'connect' }: GitHubConnectDialogProps) {
  const initialStep: Step = mode === 'manage' ? 'repos' : 'intro';
  const [step, setStep] = useState<Step>('intro');
  const [errorMsg, setErrorMsg] = useState('');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepoNames, setSelectedRepoNames] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleRepoCount, setVisibleRepoCount] = useState(REPO_PAGE_SIZE);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [savingRepos, setSavingRepos] = useState(false);

  function reset() {
    setStep(initialStep);
    setErrorMsg('');
    setRepos([]);
    setSelectedRepoNames(new Set());
    setSearchQuery('');
    setVisibleRepoCount(REPO_PAGE_SIZE);
  }

  useEffect(() => {
    if (!open) return;
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  useEffect(() => {
    if (step !== 'repos') return;
    let cancelled = false;

    async function loadRepos() {
      setLoadingRepos(true);
      try {
        const data = await getGithubRepos();
        if (cancelled) return;
        setRepos(data.repos);
        setVisibleRepoCount(REPO_PAGE_SIZE);
        setSelectedRepoNames(new Set(
          data.selectedRepos && data.selectedRepos.length > 0
            ? data.selectedRepos
            : data.repos.map((repo) => repo.fullName),
        ));
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load GitHub repositories.');
        setStep('error');
      } finally {
        if (!cancelled) setLoadingRepos(false);
      }
    }

    loadRepos();
    return () => { cancelled = true; };
  }, [step]);

  // Listen for OAuth popup callback
  useEffect(() => {
    if (!open || step !== 'waiting') return;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'github-oauth-connected') {
        setStep('repos');
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, step, onConnected, onOpenChange]);

  const checkPopupClosed = useCallback((popup: Window) => {
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setStep((current) => {
          if (current === 'waiting') return initialStep;
          return current;
        });
      }
    }, 500);
    return timer;
  }, [initialStep]);

  async function handleLogin(options?: { manageAccess?: boolean }) {
    if (useDummy) {
      setStep('repos');
      return;
    }

    if (!options?.manageAccess) {
      try {
        await getGithubRepos();
        setStep('repos');
        return;
      } catch {
        // No reusable installation is stored for this account yet; fall through to GitHub.
      }
    }

    const url = options?.manageAccess
      ? getGithubOAuthUrl({ manageAccess: true })
      : getGithubOAuthUrl();
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      url,
      'github-app-install',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`,
    );

    if (!popup) {
      setErrorMsg('Popup was blocked. Please allow popups for this site.');
      setStep('error');
      return;
    }

    setStep('waiting');
    checkPopupClosed(popup);
  }

  async function handleSaveRepos() {
    setSavingRepos(true);
    try {
      await saveSelectedRepos(Array.from(selectedRepoNames));
      onConnected();
      setStep('done');
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save selected repositories.');
      setStep('error');
    } finally {
      setSavingRepos(false);
    }
  }

  function toggleRepo(fullName: string) {
    setSelectedRepoNames((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) next.delete(fullName);
      else next.add(fullName);
      return next;
    });
  }

  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return repos;
    const q = searchQuery.toLowerCase();
    return repos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(q) ||
        repo.fullName.toLowerCase().includes(q) ||
        repo.description?.toLowerCase().includes(q) ||
        repo.language?.toLowerCase().includes(q) ||
        repo.topics.some((topic) => topic.toLowerCase().includes(q)),
    );
  }, [repos, searchQuery]);

  const allFilteredSelected = filteredRepos.length > 0 && filteredRepos.every((repo) => selectedRepoNames.has(repo.fullName));
  const visibleRepos = filteredRepos.slice(0, visibleRepoCount);
  const hiddenRepoCount = Math.max(0, filteredRepos.length - visibleRepos.length);

  function toggleAll() {
    setSelectedRepoNames((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredRepos.forEach((repo) => next.delete(repo.fullName));
      } else {
        filteredRepos.forEach((repo) => next.add(repo.fullName));
      }
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (step !== 'waiting') {
        onOpenChange(val);
        if (!val) reset();
      }
    }}>
      <DialogContent
        className="min-w-0 overflow-hidden"
        style={{
          width: step === 'repos' ? 'min(560px, calc(100vw - 2rem))' : undefined,
          maxWidth: step === 'repos' ? 'min(560px, calc(100vw - 2rem))' : 448,
        }}
      >
        {step === 'intro' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-foreground/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="text-foreground">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                </div>
                <DialogTitle>Connect GitHub</DialogTitle>
              </div>
              <DialogDescription>
                Authorize GitHub so TalentTEE can analyze selected repositories and project history.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="rounded-xl border border-border/10 bg-[#060610] px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Permissions</p>
                <p className="text-sm text-foreground">contents: read, metadata: read</p>
              </div>
              <button
                onClick={() => handleLogin()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 transition-all cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Connect GitHub
              </button>
            </div>
          </>
        )}

        {step === 'waiting' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-2xl animate-spin text-foreground">progress_activity</span>
            <p className="text-sm text-muted-foreground">Complete GitHub authorization in the popup window...</p>
            <p className="text-xs text-muted-foreground/60">The dialog will close automatically when done.</p>
          </div>
        )}

        {step === 'repos' && (
          <>
            <DialogHeader>
              <DialogTitle>Select Repositories</DialogTitle>
              <DialogDescription>
                Choose repositories to include in your work analysis.
              </DialogDescription>
            </DialogHeader>

            {loadingRepos ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <span className="material-symbols-outlined text-2xl animate-spin text-foreground">progress_activity</span>
                <p className="text-sm text-muted-foreground">Loading repositories...</p>
              </div>
            ) : (
              <div className="min-w-0 space-y-3 overflow-hidden py-2">
                <div className="relative min-w-0 w-full">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">search</span>
                  <input
                    type="text"
                    placeholder="Filter repositories..."
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setVisibleRepoCount(REPO_PAGE_SIZE);
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border/20 bg-[#060610] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/30"
                  />
                </div>

                <div className="flex min-w-0 items-center justify-between gap-3 px-1">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="min-h-10 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {allFilteredSelected ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {selectedRepoNames.size} of {repos.length} selected
                  </span>
                </div>

                <div className="min-w-0 rounded-xl border border-border/10 bg-[#060610] px-3 py-2.5 flex items-center justify-between gap-3">
                  <p className="min-w-0 text-xs text-muted-foreground">
                    Need repos that are not listed? Update GitHub App access.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleLogin({ manageAccess: true })}
                    className="min-h-10 shrink-0 text-xs font-medium text-[#00F0FF] hover:text-[#00F0FF]/80 transition-colors cursor-pointer"
                  >
                    Manage GitHub App access
                  </button>
                </div>

                <div className="max-h-[350px] min-w-0 overflow-y-auto space-y-1 pr-1 -mr-1">
                  {visibleRepos.map((repo) => (
                    <label
                      key={repo.fullName}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        aria-label={repo.name}
                        checked={selectedRepoNames.has(repo.fullName)}
                        onChange={() => toggleRepo(repo.fullName)}
                        className="mt-0.5 h-4 w-4 rounded border-border/30 accent-foreground cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{repo.name}</span>
                          {repo.isPrivate && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border border-border/20 text-muted-foreground">
                              Private
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{repo.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {repo.language && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className={`h-2.5 w-2.5 rounded-full ${LANGUAGE_COLORS[repo.language] || 'bg-gray-400'}`} />
                              {repo.language}
                            </span>
                          )}
                          {repo.stars > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <span className="material-symbols-outlined text-xs" style={{ fontSize: '14px' }}>star</span>
                              {repo.stars}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                  {filteredRepos.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-6">No repositories match your search.</p>
                  )}
                </div>

                {hiddenRepoCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setVisibleRepoCount((count) => count + REPO_PAGE_SIZE)}
                    className="min-h-10 w-full rounded-lg border border-border/10 bg-foreground/[0.03] px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-colors cursor-pointer"
                  >
                    Show {Math.min(REPO_PAGE_SIZE, hiddenRepoCount)} more repositories
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveRepos}
                  disabled={selectedRepoNames.size === 0 || savingRepos}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingRepos ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                      Saving...
                    </>
                  ) : (
                    <>Continue with {selectedRepoNames.size} {selectedRepoNames.size === 1 ? 'repo' : 'repos'}</>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-4xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="text-sm font-medium text-foreground">GitHub Connected</p>
          </div>
        )}

        {step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle>Connection Failed</DialogTitle>
              <DialogDescription>{errorMsg}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <button
                onClick={() => setStep('intro')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 transition-all cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
