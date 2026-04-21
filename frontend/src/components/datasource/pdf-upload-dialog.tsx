'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { uploadPdfResume, PdfUploadResult } from '@/lib/api';

interface PdfUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => Promise<void>;
}

type Step = 'select' | 'uploading' | 'preview' | 'done';

export function PdfUploadDialog({ open, onOpenChange, onUploaded }: PdfUploadDialogProps) {
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PdfUploadResult['parsed']>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep('select');
    setFile(null);
    setDragOver(false);
    setError(null);
    setResult(null);
  }

  const validateFile = (f: File): string | null => {
    if (f.type !== 'application/pdf') return 'Only PDF files are allowed.';
    if (f.size > 10 * 1024 * 1024) return 'File must be under 10 MB.';
    return null;
  };

  const handleFile = useCallback(async (f: File) => {
    const err = validateFile(f);
    if (err) { setError(err); return; }

    setFile(f);
    setError(null);
    setStep('uploading');

    try {
      const res = await uploadPdfResume(f);
      setResult(res.parsed);
      setStep('preview');
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      setStep('select');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleConfirm = async () => {
    setStep('done');
    await onUploaded();
    setTimeout(() => {
      onOpenChange(false);
      reset();
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (step !== 'uploading') {
        onOpenChange(val);
        if (!val) reset();
      }
    }}>
      <DialogContent className="sm:max-w-lg">
        {step === 'select' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#FF6B35]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg text-[#FF6B35]">description</span>
                </div>
                <DialogTitle>Upload PDF Resume</DialogTitle>
              </div>
              <DialogDescription>
                Upload your resume as a PDF file. AI will extract skills, experience, and education automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all ${
                  dragOver
                    ? 'border-[#FF6B35] bg-[#FF6B35]/5'
                    : 'border-border/20 bg-[#060610] hover:border-border/40'
                }`}
              >
                <span className="material-symbols-outlined text-3xl text-muted-foreground">
                  cloud_upload
                </span>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Drop your PDF here or <span className="text-[#FF6B35]">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PDF only, max 10 MB</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground/60">
                Your resume data is processed securely and used only for AI analysis
              </p>
            </div>
          </>
        )}

        {step === 'uploading' && (
          <div className="flex flex-col items-center gap-4 py-10">
            <span className="material-symbols-outlined text-3xl animate-spin text-[#FF6B35]">progress_activity</span>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Analyzing your resume...</p>
              <p className="text-xs text-muted-foreground mt-1">{file?.name}</p>
            </div>
          </div>
        )}

        {step === 'preview' && result && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <DialogTitle>Resume Parsed</DialogTitle>
              </div>
              <DialogDescription>
                Review the extracted information below. Click confirm to save.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-4 max-h-[400px] overflow-y-auto">
              {/* Summary */}
              {result.summary && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
                  <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
                </div>
              )}

              {/* Skills */}
              {result.skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.skills.map((s) => (
                      <span key={s} className="px-2 py-1 rounded-md bg-[#BF5AF2]/10 text-[#BF5AF2] text-xs font-medium border border-[#BF5AF2]/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {result.experience?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Experience</p>
                  <div className="space-y-2">
                    {result.experience.map((exp, idx) => (
                      <div key={idx} className="rounded-lg border border-border/10 bg-[#060610] px-3 py-2">
                        <p className="text-sm font-semibold text-foreground">{exp.role}</p>
                        <p className="text-xs text-muted-foreground">{exp.company} &middot; {exp.period}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {result.education?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Education</p>
                  <div className="space-y-2">
                    {result.education.map((edu, idx) => (
                      <div key={idx} className="rounded-lg border border-border/10 bg-[#060610] px-3 py-2">
                        <p className="text-sm font-semibold text-foreground">{edu.degree}</p>
                        <p className="text-xs text-muted-foreground">{edu.institution} &middot; {edu.year}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">check</span>
              Confirm &amp; Save
            </button>
          </>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="material-symbols-outlined text-4xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="text-sm font-medium text-foreground">Resume Uploaded</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
