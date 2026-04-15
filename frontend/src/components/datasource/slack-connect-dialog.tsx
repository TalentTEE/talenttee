'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface SlackConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (selectedChannels: string[]) => Promise<void>;
}

const AVAILABLE_CHANNELS = [
  { id: 'backend', name: '#backend-team', members: 8, desc: 'Backend API 개발 논의' },
  { id: 'architecture', name: '#architecture', members: 14, desc: '시스템 아키텍처 설계' },
  { id: 'codereview', name: '#code-review', members: 12, desc: '코드 리뷰 채널' },
  { id: 'general', name: '#general', members: 42, desc: '전체 공지 및 소통' },
  { id: 'devops', name: '#devops', members: 6, desc: 'CI/CD, 인프라 관리' },
  { id: 'frontend', name: '#frontend', members: 10, desc: '프론트엔드 개발 논의' },
];

type Step = 'login' | 'loading' | 'select' | 'connecting' | 'done';

export function SlackConnectDialog({ open, onOpenChange, onConnect }: SlackConnectDialogProps) {
  const [step, setStep] = useState<Step>('login');
  const [selected, setSelected] = useState<string[]>(['backend', 'architecture', 'codereview']);
  const [pending, setPending] = useState(false);

  function reset() {
    setStep('login');
    setSelected(['backend', 'architecture', 'codereview']);
    setPending(false);
  }

  function handleLogin() {
    setStep('loading');
    setTimeout(() => setStep('select'), 1500);
  }

  function toggleChannel(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleConnect() {
    setPending(true);
    setStep('connecting');
    const names = AVAILABLE_CHANNELS.filter((c) => selected.includes(c.id)).map((c) => c.name);
    await onConnect(names);
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
                <div className="h-10 w-10 rounded-xl bg-[#4A154B]/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="text-[#E01E5A]">
                    <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" />
                  </svg>
                </div>
                <DialogTitle>Slack 연결</DialogTitle>
              </div>
              <DialogDescription>
                Slack 워크스페이스를 연결하여 커뮤니케이션 패턴과 협업 스타일을 분석합니다
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="rounded-xl border border-border/10 bg-[#060610] px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">워크스페이스</p>
                <p className="text-sm text-foreground">acme-corp.slack.com</p>
              </div>
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#4A154B] text-white font-semibold text-base hover:bg-[#3a1039] transition-all"
              >
                Slack으로 로그인
              </button>
              <p className="text-xs text-center text-muted-foreground/60">
                읽기 전용 권한만 요청합니다
              </p>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-2xl animate-spin text-[#4A154B]">progress_activity</span>
            <p className="text-sm text-muted-foreground">Slack에 연결하는 중...</p>
          </div>
        )}

        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>채널 선택</DialogTitle>
              <DialogDescription>
                업무 분석에 포함할 채널을 선택하세요
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2 max-h-[320px] overflow-y-auto">
              {AVAILABLE_CHANNELS.map((ch) => (
                <label
                  key={ch.id}
                  className="flex items-start gap-3 rounded-xl border border-border/10 bg-[#060610] px-4 py-3 cursor-pointer hover:border-border/20 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(ch.id)}
                    onChange={() => toggleChannel(ch.id)}
                    className="mt-1 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-muted-foreground">tag</span>
                      <span className="text-sm font-medium text-foreground">{ch.name.replace('#', '')}</span>
                      <span className="text-xs text-muted-foreground/50 ml-auto">{ch.members}명</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{ch.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={handleConnect}
              disabled={selected.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selected.length}개 채널 연결하기
            </button>
          </>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
            <p className="text-sm text-muted-foreground">메시지 분석 중...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-4xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="text-sm font-medium text-foreground">Slack 연결 완료</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
