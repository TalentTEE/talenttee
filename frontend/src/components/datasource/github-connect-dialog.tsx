'use client';

import { useState, useEffect, useCallback } from 'react';
import { getGithubOAuthUrl } from '@/lib/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface GitHubConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
  useDummy: boolean;
}

type Step = 'intro' | 'waiting' | 'done' | 'error';

export function GitHubConnectDialog({ open, onOpenChange, onConnected, useDummy }: GitHubConnectDialogProps) {
  const [step, setStep] = useState<Step>('intro');
  const [errorMsg, setErrorMsg] = useState('');

  function reset() {
    setStep('intro');
    setErrorMsg('');
  }

  // Listen for OAuth popup callback
  useEffect(() => {
    if (!open || step !== 'waiting') return;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'github-oauth-connected') {
        setStep('done');
        onConnected();
        setTimeout(() => {
          onOpenChange(false);
          reset();
        }, 800);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, step, onConnected, onOpenChange]);

  // Check if popup was closed without completing OAuth
  const checkPopupClosed = useCallback((popup: Window) => {
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        // Only show error if we're still in waiting state
        setStep((current) => {
          if (current === 'waiting') return 'intro';
          return current;
        });
      }
    }, 500);
    return timer;
  }, []);

  function handleLogin() {
    if (useDummy) {
      // In dummy mode, just mark as connected immediately
      setStep('done');
      onConnected();
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 800);
      return;
    }

    const url = getGithubOAuthUrl();
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      url,
      'github-oauth',
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

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (step !== 'waiting') {
        onOpenChange(val);
        if (!val) reset();
      }
    }}>
      <DialogContent className="sm:max-w-md">
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
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 transition-all cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Sign in with GitHub
              </button>
            </div>
          </>
        )}

        {step === 'waiting' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-2xl animate-spin text-foreground">progress_activity</span>
            <p className="text-sm text-muted-foreground">Complete sign-in in the popup window...</p>
            <p className="text-xs text-muted-foreground/60">The dialog will close automatically when done.</p>
          </div>
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
