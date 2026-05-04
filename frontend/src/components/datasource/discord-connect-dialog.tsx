'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface DiscordConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (selectedServers: string[]) => Promise<void>;
}

const AVAILABLE_SERVERS = [
  { id: 'near-kr', name: 'NEAR Korea Developers', members: 1240, role: 'Core Contributor' },
  { id: 'ts-kr', name: 'TypeScript Korea', members: 3500, role: 'Moderator' },
  { id: 'web3', name: 'Web3 Builders', members: 890, role: 'Member' },
  { id: 'react-kr', name: 'React Korea', members: 5200, role: 'Member' },
  { id: 'rust-lang', name: 'Rust Language', members: 2100, role: 'Member' },
];

type Step = 'login' | 'loading' | 'select' | 'connecting' | 'done';

export function DiscordConnectDialog({ open, onOpenChange, onConnect }: DiscordConnectDialogProps) {
  const [step, setStep] = useState<Step>('login');
  const [selected, setSelected] = useState<string[]>(['near-kr', 'ts-kr', 'web3']);
  const [pending, setPending] = useState(false);

  function reset() {
    setStep('login');
    setSelected(['near-kr', 'ts-kr', 'web3']);
    setPending(false);
  }

  function handleLogin() {
    setStep('loading');
    setTimeout(() => setStep('select'), 1500);
  }

  function toggleServer(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleConnect() {
    setPending(true);
    setStep('connecting');
    const names = AVAILABLE_SERVERS.filter((s) => selected.includes(s.id)).map((s) => s.name);
    await onConnect(names);
    setStep('done');
    setTimeout(() => {
      onOpenChange(false);
      reset();
    }, 800);
  }

  const ROLE_STYLE: Record<string, string> = {
    Moderator: 'bg-amber-500/10 text-amber-400',
    'Core Contributor': 'bg-primary/10 text-primary',
    Member: 'bg-muted text-muted-foreground',
  };

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
                <div className="h-10 w-10 rounded-xl bg-[#5865F2]/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="text-[#5865F2]">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </div>
                <DialogTitle>Connect Discord</DialogTitle>
              </div>
              <DialogDescription>
                Analyze Discord server activity to evaluate community contributions and technical discussion participation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#5865F2] text-white font-semibold text-base hover:bg-[#4752c4] transition-all"
              >
                Sign in with Discord
              </button>
              <p className="text-xs text-center text-muted-foreground/60">
                Read-only permissions will be requested
              </p>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-2xl animate-spin text-[#5865F2]">progress_activity</span>
            <p className="text-sm text-muted-foreground">Connecting to Discord...</p>
          </div>
        )}

        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>Select Servers</DialogTitle>
              <DialogDescription>
                Choose servers to include in analysis
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2 max-h-[320px] overflow-y-auto">
              {AVAILABLE_SERVERS.map((srv) => (
                <label
                  key={srv.id}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 cursor-pointer hover:border-primary/20 transition-colors shadow-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(srv.id)}
                    onChange={() => toggleServer(srv.id)}
                    className="mt-1 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{srv.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto ${ROLE_STYLE[srv.role] ?? ROLE_STYLE.Member}`}>
                        {srv.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">{srv.members.toLocaleString()} members</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={handleConnect}
              disabled={selected.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect {selected.length} servers
            </button>
          </>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
            <p className="text-sm text-muted-foreground">Analyzing activity...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-4xl text-[#65a30d]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="text-sm font-medium text-foreground">Discord Connected</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
