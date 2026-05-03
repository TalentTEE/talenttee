'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DataSourceConnection, DatasourceDetail } from '@/lib/types';
import { ResumeProfile } from '@/lib/types';
import {
  getDatasourceStatus, getDatasourceData, connectDatasourceMock, disconnectDatasource,
  getResume, generateResume, getResumeStatus, USE_DUMMY,
  getPreferences, updatePreferences, updatePdfData,
} from '@/lib/api';
import { formatCurrency, formatSalary } from '@/lib/format';
import { GitHubConnectDialog } from '@/components/datasource/github-connect-dialog';
import { SlackConnectDialog } from '@/components/datasource/slack-connect-dialog';
import { DiscordConnectDialog } from '@/components/datasource/discord-connect-dialog';
import { Gov24ConnectDialog } from '@/components/datasource/gov24-connect-dialog';
import { PdfUploadDialog } from '@/components/datasource/pdf-upload-dialog';
import { DatasourceDetailView } from '@/components/datasource/datasource-detail-view';
import { useToast } from '@/components/ui/toast-provider';
import { AINudge } from '@/components/ui/AINudge';
import { GitHubIcon, SlackIcon, DiscordIcon } from '@/components/icons/provider-icons';
import { ReactNode } from 'react';

const PROVIDERS: { id: DataSourceConnection['provider']; label: string; icon: string; brandIcon?: (props: { className?: string }) => ReactNode }[] = [
  { id: 'GITHUB', label: 'GitHub', icon: 'code', brandIcon: GitHubIcon },
  { id: 'SLACK', label: 'Slack', icon: 'chat', brandIcon: SlackIcon },
  { id: 'DISCORD', label: 'Discord', icon: 'forum', brandIcon: DiscordIcon },
  { id: 'GOV24', label: 'Gov24', icon: 'assured_workload' },
  { id: 'PDF', label: 'PDF Resume', icon: 'description' },
];

const STEPS = [
  { key: 'COLLECTING', label: 'Collecting', icon: 'cloud_download' },
  { key: 'ANALYZING', label: 'Analyzing', icon: 'psychology' },
  { key: 'COMPLETE', label: 'Complete', icon: 'check_circle' },
] as const;

function stepIndex(status: ResumeProfile['status']): number {
  return STEPS.findIndex((s) => s.key === status);
}

export default function DatasourcePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  // ── Datasource state ──
  const [connections, setConnections] = useState<DataSourceConnection[]>([]);
  const [loadingDs, setLoadingDs] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  // ── Expand/collapse state ──
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [dsData, setDsData] = useState<Record<string, DatasourceDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<Record<string, boolean>>({});

  // ── Negotiation preferences state ──
  const [salaryFloor, setSalaryFloor] = useState<number>(60000);
  const [autoNegLimit, setAutoNegLimit] = useState<number>(5);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const prefsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncPreferences = useCallback((prefs: { salaryFloor?: number; autoNegLimit?: number }) => {
    if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current);
    prefsSaveTimer.current = setTimeout(() => {
      updatePreferences(prefs).catch(() => {});
    }, 500);
  }, []);

  useEffect(() => {
    if (!user) return;
    getPreferences()
      .then((prefs) => {
        setSalaryFloor(prefs.salaryFloor ?? 60000);
        setAutoNegLimit(prefs.autoNegLimit ?? 5);
      })
      .catch(() => {
        const saved = localStorage.getItem('tt_salary_floor');
        setSalaryFloor(saved ? Number(saved) : 60000);
        const limit = localStorage.getItem('tt_auto_neg_limit');
        setAutoNegLimit(limit ? Number(limit) : 5);
      })
      .finally(() => setPrefsLoaded(true));
  }, [user]);

  const handleFloorChange = (value: number) => {
    setSalaryFloor(value);
    localStorage.setItem('tt_salary_floor', String(value));
    syncPreferences({ salaryFloor: value });
  };

  const handleLimitChange = (delta: number) => {
    const next = Math.max(1, Math.min(20, autoNegLimit + delta));
    setAutoNegLimit(next);
    localStorage.setItem('tt_auto_neg_limit', String(next));
    syncPreferences({ autoNegLimit: next });
  };

  // ── Analysis state ──
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [simulatedStatus, setSimulatedStatus] = useState<ResumeProfile['status'] | null>(null);
  const autoGenTriggered = useRef(false);

  // ── Handle OAuth popup callback ──
  const [isOAuthPopup, setIsOAuthPopup] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('github') === 'connected') {
      if (window.opener) {
        // We're inside a popup — notify parent and close
        setIsOAuthPopup(true);
        window.opener.postMessage({ type: 'github-oauth-connected' }, window.location.origin);
        window.close();
        return;
      }
      // Direct navigation fallback — clean up URL and refresh
      window.history.replaceState({}, '', '/datasource');
      fetchConnections();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && user.role !== 'SEEKER') router.replace('/dashboard/employer');
  }, [user, router]);

  // ── Fetch datasources ──
  const fetchConnections = useCallback(async () => {
    try {
      const data = await getDatasourceStatus();
      setConnections(data);
      return data;
    } finally {
      setLoadingDs(false);
    }
  }, []);

  // ── Fetch resume + auto-generate ──
  useEffect(() => {
    if (!user) return;
    Promise.all([
      getResume().then(setResume).catch(() => setResume(null)),
      fetchConnections(),
    ]).then(([, datasources]) => {
      const hasConnected = datasources.some(
        (d) => d.status === 'CONNECTED' || d.status === 'MOCK'
      );
      if (hasConnected && !autoGenTriggered.current) {
        getResume()
          .then((r) => {
            if (!r || r.status !== 'COMPLETE') {
              autoGenTriggered.current = true;
              handleGenerate();
            }
          })
          .catch(() => {
            autoGenTriggered.current = true;
            handleGenerate();
          });
      }
    }).finally(() => setLoadingResume(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Datasource handlers ──
  const connectionMap = new Map(connections.map((c) => [c.provider, c]));
  const connected = connections.filter((c) => c.status === 'CONNECTED' || c.status === 'MOCK');
  const connectedCount = connected.length;

  const openConnectDialog = (provider: string) => {
    setDialogOpen(provider);
  };

  const handleDialogConnect = useCallback(async (provider: string) => {
    // GitHub uses real OAuth flow — connectDatasourceMock is only for non-GitHub providers
    if (provider !== 'GITHUB') {
      await connectDatasourceMock(provider);
    }
    await fetchConnections();
  }, [fetchConnections]);

  const handleResyncAll = useCallback(async () => {
    if (connected.length === 0) return;
    setSyncingAll(true);
    try {
      await Promise.all(connected.map((c) => getDatasourceData(c.provider)));
      addToast('All sources refreshed.', 'success');
    } catch {
      addToast('Some sources failed to refresh.', 'error');
    } finally {
      setSyncingAll(false);
    }
  }, [connected, addToast]);

  const handleDisconnect = useCallback(async (provider: string) => {
    try {
      await disconnectDatasource(provider);
      await fetchConnections();
      addToast(`${provider} disconnected.`, 'success');
    } catch {
      addToast(`Failed to disconnect ${provider}.`, 'error');
    }
  }, [fetchConnections, addToast]);

  const toggleExpand = useCallback(async (providerId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
        // Fetch data if not cached
        if (!dsData[providerId]) {
          setLoadingDetail((ld) => ({ ...ld, [providerId]: true }));
          getDatasourceData(providerId)
            .then((data) => setDsData((d) => ({ ...d, [providerId]: data })))
            .catch(() => {})
            .finally(() => setLoadingDetail((ld) => ({ ...ld, [providerId]: false })));
        }
      }
      return next;
    });
  }, [dsData]);

  function formatTime(dateStr?: string) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // ── Analysis handlers ──
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setSimulatedStatus('COLLECTING');

    if (USE_DUMMY) {
      setTimeout(() => setSimulatedStatus('ANALYZING'), 1500);
      setTimeout(() => {
        setSimulatedStatus('COMPLETE');
        if (user) {
          getResume()
            .then((data) => { setResume(data); setGenerating(false); setSimulatedStatus(null); })
            .catch(() => { setGenerating(false); setSimulatedStatus(null); });
        }
      }, 3000);
      return;
    }

    try {
      await generateResume();
      const pollInterval = setInterval(async () => {
        try {
          const { status: currentStatus } = await getResumeStatus();
          setSimulatedStatus(currentStatus as ResumeProfile['status']);
          if (currentStatus === 'COMPLETE') {
            clearInterval(pollInterval);
            if (user) { const fullResume = await getResume(); setResume(fullResume); }
            setGenerating(false);
            setSimulatedStatus(null);
          }
        } catch {
          clearInterval(pollInterval);
          setGenerating(false);
          setSimulatedStatus(null);
        }
      }, 2000);
    } catch {
      setGenerating(false);
      setSimulatedStatus(null);
    }
  }, [user]);

  const currentStatus = simulatedStatus || resume?.status;
  const currentStepIdx = currentStatus ? stepIndex(currentStatus) : -1;
  const isComplete = currentStatus === 'COMPLETE' && resume && !generating;
  const loading = loadingDs || loadingResume;

  // ── Render ──
  if (isOAuthPopup) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="material-symbols-outlined text-2xl animate-spin text-muted-foreground">progress_activity</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto py-10 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64" />
          <div className="h-24 bg-muted rounded-2xl mt-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 bg-muted rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            My Value
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            {connectedCount} of {PROVIDERS.length} connected
          </p>
        </div>
        {(!resume || resume.status !== 'COMPLETE') && !generating && connectedCount > 0 && (
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            Generate Analysis
          </button>
        )}
      </div>

      {/* Generation Progress — always visible once generation has started */}
      {(generating || currentStatus) && (
        <div className="rounded-2xl border border-border/10 bg-card p-6">
          <h2 className="font-[var(--font-manrope)] font-bold text-foreground mb-6">
            Generation Progress
          </h2>
          <div className="flex items-center gap-0">
            {STEPS.map((step, idx) => {
              const isActive = idx === currentStepIdx;
              const isDone = idx < currentStepIdx || (idx === currentStepIdx && currentStatus === 'COMPLETE' && !generating);
              const isPending = idx > currentStepIdx || currentStepIdx === -1;

              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isDone ? 'bg-emerald-500/10 text-emerald-400'
                        : isActive ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground/40'
                    }`}>
                      <span
                        className={`material-symbols-outlined text-2xl ${isActive && generating ? 'animate-pulse' : ''}`}
                        style={isDone || isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {isDone ? 'check_circle' : step.icon}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${
                      isDone ? 'text-emerald-400' : isActive ? 'text-primary' : 'text-muted-foreground/40'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 mx-3 h-0.5 rounded-full overflow-hidden bg-muted">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        idx < currentStepIdx ? 'w-full bg-emerald-500'
                          : idx === currentStepIdx && generating ? 'w-1/2 bg-primary animate-pulse'
                          : 'w-0 bg-primary'
                      }`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {generating && (
            <div className="mt-6 flex items-center gap-2 text-base text-muted-foreground">
              <span className="material-symbols-outlined text-base text-primary animate-spin">progress_activity</span>
              {currentStatus === 'COLLECTING' ? 'Collecting data from connected sources...'
                : currentStatus === 'ANALYZING' ? 'AI is analyzing your professional profile...'
                : 'Finalizing your analysis...'}
            </div>
          )}
        </div>
      )}

      {/* AI Nudge — only "data sources ready" nudge */}
      {!resume && !generating && connectedCount > 0 && (
        <AINudge id="resume-none" message="Your data sources are ready. Generate your AI analysis now — it takes about 30 seconds." />
      )}
      {generating && (
        <AINudge id="resume-gen" message="AI is analyzing your professional history across all connected sources..." />
      )}

      {/* ── Data Source Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-manrope)] font-bold text-foreground">Connected Sources</h2>
          {connectedCount > 0 && (
            <button
              onClick={handleResyncAll}
              disabled={syncingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-sm ${syncingAll ? 'animate-spin' : ''}`}>sync</span>
              {syncingAll ? 'Syncing...' : 'Resync All'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROVIDERS.map((provider) => {
            const conn = connectionMap.get(provider.id);
            const isConnected = conn && conn.status !== 'DISCONNECTED';

            return (
              <div
                key={provider.id}
                className={`rounded-2xl border p-5 transition-all ${
                  isConnected ? 'bg-[#00F0FF]/[0.03] border-[#00F0FF]/15' : 'bg-card border-border/10'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isConnected ? 'bg-[#00F0FF]/10' : 'bg-muted/50'
                  }`}>
                    {provider.brandIcon ? (
                      <provider.brandIcon className={isConnected ? 'text-[#00F0FF]' : 'text-muted-foreground'} />
                    ) : (
                      <span className={`material-symbols-outlined text-lg ${
                        isConnected ? 'text-[#00F0FF]' : 'text-muted-foreground'
                      }`}>{provider.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">{provider.label}</span>
                    {isConnected ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-xs text-emerald-400">Connected</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Not connected</p>
                    )}
                  </div>
                </div>

                {isConnected ? (
                  <>
                    <div className="flex items-center justify-between">
                      {conn?.lastSyncedAt && (
                        <p className="text-xs text-muted-foreground">Last synced: {formatTime(conn.lastSyncedAt)}</p>
                      )}
                      <button
                        onClick={() => handleDisconnect(provider.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">link_off</span>
                        Disconnect
                      </button>
                    </div>

                    {/* Expand/collapse toggle */}
                    <button
                      onClick={() => toggleExpand(provider.id)}
                      className="w-full flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border/10 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {expandedCards.has(provider.id) ? 'Hide details' : 'View details'}
                      <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${expandedCards.has(provider.id) ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>

                    {/* Expanded detail */}
                    {expandedCards.has(provider.id) && (
                      loadingDetail[provider.id] ? (
                        <div className="flex items-center justify-center gap-2 py-6">
                          <span className="material-symbols-outlined text-base animate-spin text-muted-foreground">progress_activity</span>
                          <span className="text-xs text-muted-foreground">Loading data...</span>
                        </div>
                      ) : dsData[provider.id] ? (
                        <DatasourceDetailView
                          provider={provider.id}
                          data={dsData[provider.id]}
                          onSave={provider.id === 'PDF' ? async (updated) => {
                            await updatePdfData(updated);
                            setDsData((d) => ({ ...d, PDF: updated }));
                            addToast('PDF data updated.', 'success');
                          } : undefined}
                        />
                      ) : null
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => openConnectDialog(provider.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#00F0FF] text-[#0a0a0a] hover:brightness-90 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add_link</span>
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Analysis Results ── */}
      {isComplete && resume && (
        <div className="space-y-6">
          {/* AI Summary */}
          <div className="rounded-2xl border border-border/10 bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-lg text-[#00F0FF]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <h2 className="font-[var(--font-manrope)] font-bold text-foreground">AI Summary</h2>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed">{resume.summary}</p>
          </div>

          {/* Market Value + Negotiation Preferences */}
          <div className="rounded-2xl border border-border/10 bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-lg text-[#39FF14]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
              <h2 className="font-[var(--font-manrope)] font-bold text-foreground">Estimated Market Value</h2>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-[var(--font-manrope)] text-3xl font-extrabold text-[#39FF14]">
                {formatCurrency(resume.marketValueMin)} - {formatCurrency(resume.marketValueMax)}
              </span>
              <span className="text-base text-muted-foreground">/ year</span>
            </div>
            {resume.marketValueReasoning && (
              <p className="text-base text-muted-foreground leading-relaxed">{resume.marketValueReasoning}</p>
            )}

            {/* Salary Floor */}
            {prefsLoaded && (
              <div className="mt-5 pt-5 border-t border-border/10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-base text-[#39FF14]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                  <p className="text-sm font-semibold text-foreground">Your Salary Floor</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  AI will never accept an offer below this amount.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={30000}
                    max={300000}
                    step={5000}
                    value={salaryFloor}
                    onChange={(e) => handleFloorChange(Number(e.target.value))}
                    className="flex-1 accent-[#39FF14] h-2 rounded-full cursor-pointer"
                  />
                  <div className="flex items-center bg-muted rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-[#39FF14]/50">
                    <span className="text-sm text-muted-foreground mr-1">$</span>
                    <input
                      type="number"
                      min={30000}
                      max={300000}
                      step={5000}
                      value={salaryFloor}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!isNaN(v)) handleFloorChange(Math.max(30000, Math.min(300000, v)));
                      }}
                      className="w-20 bg-transparent text-sm font-bold text-foreground border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* Auto-Negotiate Limit */}
                <div className="mt-4 pt-4 border-t border-border/10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Auto-Negotiate Limit</p>
                    <p className="text-xs text-muted-foreground">Max companies to negotiate automatically</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleLimitChange(-1)}
                      disabled={autoNegLimit <= 1}
                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground font-bold hover:bg-accent transition-colors disabled:opacity-30"
                    >
                      &minus;
                    </button>
                    <span className="w-10 text-center text-base font-bold text-foreground">{autoNegLimit}</span>
                    <button
                      onClick={() => handleLimitChange(1)}
                      disabled={autoNegLimit >= 20}
                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground font-bold hover:bg-accent transition-colors disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="rounded-2xl border border-border/10 bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-lg text-[#BF5AF2]" style={{ fontVariationSettings: "'FILL' 1" }}>code</span>
              <h2 className="font-[var(--font-manrope)] font-bold text-foreground">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill) => (
                <span key={skill} className="px-3 py-1.5 rounded-lg bg-[#BF5AF2]/10 text-[#BF5AF2] text-base font-medium border border-[#BF5AF2]/20">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="rounded-2xl border border-border/10 bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-lg text-[#FF2DF1]" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
              <h2 className="font-[var(--font-manrope)] font-bold text-foreground">Experience</h2>
            </div>
            <div className="space-y-0">
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-[#FF2DF1] border-2 border-card z-10" />
                    {idx < resume.experience.length - 1 && <div className="w-0.5 flex-1 bg-muted" />}
                  </div>
                  <div className="pb-8 last:pb-0 flex-1">
                    <h3 className="font-[var(--font-manrope)] font-bold text-foreground text-base">{exp.role}</h3>
                    <div className="flex items-center gap-2 mt-0.5 mb-2">
                      <span className="text-base text-muted-foreground">{exp.company}</span>
                      <span className="text-muted-foreground/30">|</span>
                      <span className="text-sm text-muted-foreground/60">{exp.period}</span>
                    </div>
                    <ul className="space-y-1">
                      {exp.highlights?.map((highlight, hIdx) => (
                        <li key={hIdx} className="flex items-start gap-2 text-base text-muted-foreground">
                          <span className="text-[#FF2DF1]/40 mt-1 text-sm">&#9679;</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="rounded-2xl border border-border/10 bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-lg text-[#FFE600]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              <h2 className="font-[var(--font-manrope)] font-bold text-foreground">Education</h2>
            </div>
            <div className="space-y-3">
              {resume.education.map((edu, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-accent">
                  <div>
                    <p className="text-base font-semibold text-foreground">{edu.degree}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{edu.institution}</p>
                  </div>
                  <span className="text-sm text-muted-foreground/60 font-medium">{edu.year}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Improvement Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border/10 bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-lg text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
                <h2 className="font-[var(--font-manrope)] font-bold text-foreground">Strengths</h2>
              </div>
              <ul className="space-y-2">
                {(resume.strengths ?? []).map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-base text-muted-foreground">
                    <span className="text-emerald-400 mt-0.5"><span className="material-symbols-outlined text-base">check</span></span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/10 bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-lg text-[#FF2DF1]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                <h2 className="font-[var(--font-manrope)] font-bold text-foreground">Areas to Improve</h2>
              </div>
              <ul className="space-y-2">
                {(resume.improvementAreas ?? []).map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-base text-muted-foreground">
                    <span className="text-[#FF2DF1] mt-0.5"><span className="material-symbols-outlined text-base">arrow_forward</span></span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Negotiation Points */}
          {resume.negotiationPoints && (
            <div className="rounded-2xl border border-border/10 bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-lg text-[#00F0FF]" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
                <h2 className="font-[var(--font-manrope)] font-bold text-foreground">Negotiation Points</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">Leverage Points</h3>
                  <ul className="space-y-2">
                    {resume.negotiationPoints.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-base text-muted-foreground">
                        <span className="text-emerald-400 mt-0.5"><span className="material-symbols-outlined text-base">add_circle</span></span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#FFE600] uppercase tracking-wider mb-3">Watch Out For</h3>
                  <ul className="space-y-2">
                    {resume.negotiationPoints.weaknesses.map((w, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-base text-muted-foreground">
                        <span className="text-[#FFE600] mt-0.5"><span className="material-symbols-outlined text-base">warning</span></span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connect Dialogs */}
      <GitHubConnectDialog
        open={dialogOpen === 'GITHUB'}
        onOpenChange={(val) => !val && setDialogOpen(null)}
        onConnected={() => { fetchConnections(); }}
        useDummy={USE_DUMMY}
      />
      <SlackConnectDialog
        open={dialogOpen === 'SLACK'}
        onOpenChange={(val) => !val && setDialogOpen(null)}
        onConnect={async () => { await handleDialogConnect('SLACK'); }}
      />
      <DiscordConnectDialog
        open={dialogOpen === 'DISCORD'}
        onOpenChange={(val) => !val && setDialogOpen(null)}
        onConnect={async () => { await handleDialogConnect('DISCORD'); }}
      />
      <Gov24ConnectDialog
        open={dialogOpen === 'GOV24'}
        onOpenChange={(val) => !val && setDialogOpen(null)}
        onVerified={async () => { await handleDialogConnect('GOV24'); }}
      />
      <PdfUploadDialog
        open={dialogOpen === 'PDF'}
        onOpenChange={(val) => !val && setDialogOpen(null)}
        onUploaded={async () => { await fetchConnections(); }}
      />
    </div>
  );
}
