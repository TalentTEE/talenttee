'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { getGithubOAuthUrl, getDatasourceData } from '@/lib/api';
import type { GitHubData } from '@/lib/types';

interface GitHubConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (selectedRepos: string[]) => Promise<void>;
  useDummy: boolean;
}

interface RepoItem {
  id: string;
  name: string;
  lang: string;
  stars: number;
  desc: string;
}

const DUMMY_REPOS: RepoItem[] = [
  { id: 'defi-swap', name: 'defi-swap-protocol', lang: 'Rust', stars: 34, desc: 'Decentralized token swap on NEAR Protocol' },
  { id: 'ai-resume', name: 'ai-resume-builder', lang: 'TypeScript', stars: 89, desc: 'AI-powered resume generation tool' },
  { id: 'react-dash', name: 'react-dashboard-kit', lang: 'TypeScript', stars: 156, desc: 'Enterprise dashboard component library' },
  { id: 'near-sdk', name: 'near-sdk-examples', lang: 'Rust', stars: 23, desc: 'NEAR smart contract examples' },
  { id: 'blog-next', name: 'blog-nextjs', lang: 'TypeScript', stars: 12, desc: 'Personal blog built with Next.js' },
  { id: 'py-ml', name: 'ml-pipeline', lang: 'Python', stars: 45, desc: 'Machine learning data pipeline' },
];

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  Rust: '#dea584',
  Python: '#3572A5',
  JavaScript: '#f1e05a',
};

type Step = 'login' | 'loading' | 'select' | 'connecting' | 'done';

export function GitHubConnectDialog({ open, onOpenChange, onConnect, useDummy }: GitHubConnectDialogProps) {
  const [step, setStep] = useState<Step>('login');
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function reset() {
    setStep('login');
    setSelected([]);
    setPending(false);
    setRepos([]);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  // After OAuth popup completes — fetch real repos from backend
  async function onOAuthDone() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    try {
      const data = (await getDatasourceData('GITHUB')) as GitHubData;
      const fetched: RepoItem[] = data.repositories.map((r) => ({
        id: r.name, name: r.name, lang: r.language, stars: r.stars, desc: r.description,
      }));
      setRepos(fetched);
      setSelected(fetched.slice(0, 3).map((r) => r.id));
      setStep('select');
    } catch {
      // Backend might not be ready — fall back to login
      setStep('login');
    }
  }

  // Listen for postMessage from the OAuth popup callback page
  useEffect(() => {
    if (step !== 'loading' || useDummy) return;
    function handleMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'github-oauth-connected') onOAuthDone();
    }
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, useDummy]);

  function handleLogin() {
    if (!useDummy) {
      // Real mode: open OAuth popup, wait for completion
      const url = getGithubOAuthUrl();
      const popup = window.open(url, 'github-oauth', 'width=600,height=700,left=200,top=100');
      setStep('loading');
      // Fallback poll: if postMessage doesn't fire, detect popup close
      pollRef.current = setInterval(() => {
        if (!popup || popup.closed) onOAuthDone();
      }, 500);
      return;
    }
    // Dummy mode: simulated loading → dummy repos
    setStep('loading');
    setTimeout(() => {
      setRepos(DUMMY_REPOS);
      setSelected(['defi-swap', 'ai-resume', 'react-dash']);
      setStep('select');
    }, 1500);
  }

  function toggleRepo(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  async function handleConnect() {
    setPending(true);
    setStep('connecting');
    const repoNames = repos.filter((r) => selected.includes(r.id)).map((r) => r.name);
    await onConnect(repoNames);
    setStep('done');
    setTimeout(() => {
      onOpenChange(false);
      reset();
    }, 800);
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (step !== 'connecting' && !pending) {
        onOpenChange(val);
        if (!val) reset();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        {step === 'login' && (
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
                Connect your GitHub account to analyze code contributions, tech stack, and project history
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="rounded-xl border border-border/10 bg-[#060610] px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Permissions</p>
                <p className="text-sm text-foreground">read:user, repo (read-only)</p>
              </div>
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Sign in with GitHub
              </button>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-2xl animate-spin text-foreground">progress_activity</span>
            <p className="text-sm text-muted-foreground">
              {useDummy ? 'Connecting to GitHub...' : 'Complete sign-in in the popup window...'}
            </p>
          </div>
        )}

        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>Select Repositories</DialogTitle>
              <DialogDescription>
                Choose repositories to include in AI analysis
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2 max-h-[320px] overflow-y-auto">
              {repos.map((repo) => (
                <label
                  key={repo.id}
                  className="flex items-start gap-3 rounded-xl border border-border/10 bg-[#060610] px-4 py-3 cursor-pointer hover:border-border/20 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(repo.id)}
                    onChange={() => toggleRepo(repo.id)}
                    className="mt-1 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{repo.name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[repo.lang] ?? '#8b8b8b' }} />
                        {repo.lang}
                      </span>
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground ml-auto">
                        <span className="material-symbols-outlined text-xs">star</span>
                        {repo.stars}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{repo.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={handleConnect}
              disabled={selected.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect {selected.length} repositories
            </button>
          </>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
            <p className="text-sm text-muted-foreground">Analyzing repositories...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-4xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="text-sm font-medium text-foreground">GitHub Connected</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
