'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface Gov24ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (method: string) => Promise<void>;
}

type Step = 'choose' | 'verifying' | 'verified' | 'connecting' | 'done';

export function Gov24ConnectDialog({ open, onOpenChange, onVerified }: Gov24ConnectDialogProps) {
  const [step, setStep] = useState<Step>('choose');
  const [verifyMethod, setVerifyMethod] = useState<string | null>(null);

  function reset() {
    setStep('choose');
    setVerifyMethod(null);
  }

  async function handleVerify(method: string) {
    setVerifyMethod(method);
    setStep('verifying');
    await new Promise((r) => setTimeout(r, 1500));
    setStep('verified');
    await new Promise((r) => setTimeout(r, 500));
    setStep('connecting');
    await onVerified(method);
    setStep('done');
    setTimeout(() => {
      onOpenChange(false);
      reset();
    }, 800);
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (step === 'choose' || step === 'done') {
        onOpenChange(val);
        if (!val) reset();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        {step === 'choose' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    assured_workload
                  </span>
                </div>
                <DialogTitle>Identity Verification</DialogTitle>
              </div>
              <DialogDescription>
                Verify your identity to connect Gov24 data. Certifications and education will be verified automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <button
                onClick={() => handleVerify('kakao')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FEE500] text-[#191919] font-semibold text-base hover:bg-[#FDD800] transition-all"
              >
                Verify with Kakao
              </button>
              <button
                onClick={() => handleVerify('pass')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary/30 text-primary font-semibold text-base hover:bg-primary/5 transition-all"
              >
                Verify with PASS
              </button>
            </div>
          </>
        )}

        {step === 'verifying' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
            <p className="text-sm text-muted-foreground">
              Verifying with {verifyMethod === 'kakao' ? 'Kakao' : 'PASS'}...
            </p>
          </div>
        )}

        {step === 'verified' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-4xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <p className="text-sm font-medium text-foreground">Verification complete</p>
          </div>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
            <p className="text-sm text-muted-foreground">Verifying certifications and education...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-4xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="text-sm font-medium text-foreground">Gov24 Connected</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
