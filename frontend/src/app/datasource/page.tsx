'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getDatasourceStatus, connectDatasourceMock, connectGithubOAuth, USE_DUMMY } from '@/lib/api';
import { DataSourceConnection } from '@/lib/types';
import { AINudge } from '@/components/ui/AINudge';

/* ── Brand SVG Icons ── */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.527 2.527 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const providerIcons: Record<string, React.ReactNode> = {
  GITHUB: <GitHubIcon className="w-6 h-6" />,
  SLACK: <SlackIcon className="w-6 h-6" />,
  DISCORD: <DiscordIcon className="w-6 h-6" />,
};

/* ── Collected Data Stats (dummy) ── */
const COLLECTED_DATA: Record<string, { icon: string; label: string; value: string }[]> = {
  GITHUB: [
    { icon: 'folder', label: 'Repositories', value: '127' },
    { icon: 'commit', label: 'Commits', value: '2,340' },
    { icon: 'merge_type', label: 'Pull Requests', value: '189' },
    { icon: 'star', label: 'Stars Received', value: '56' },
  ],
  SLACK: [
    { icon: 'chat_bubble', label: 'Messages', value: '15,230' },
    { icon: 'tag', label: 'Channels', value: '8' },
    { icon: 'emoji_emotions', label: 'Reactions Given', value: '1,847' },
    { icon: 'attachment', label: 'Files Shared', value: '94' },
  ],
  DISCORD: [
    { icon: 'chat_bubble', label: 'Messages', value: '3,210' },
    { icon: 'dns', label: 'Servers', value: '12' },
    { icon: 'forum', label: 'Threads', value: '47' },
    { icon: 'emoji_events', label: 'Roles', value: '5' },
  ],
  GOV24: [
    { icon: 'workspace_premium', label: 'Certifications', value: '4' },
    { icon: 'school', label: 'Degrees', value: '2' },
    { icon: 'verified', label: 'Verified Records', value: '6' },
    { icon: 'calendar_month', label: 'Last Verified', value: 'Apr 2026' },
  ],
};

type ConnectPhase = 'connecting' | 'syncing' | 'done';

const SYNC_STATS: Record<string, string> = {
  GITHUB: 'Analyzing 127 repositories, 2,340 commits...',
  SLACK: 'Processing 15,000 messages across 8 channels...',
  DISCORD: 'Reviewing 3,200 messages in 12 servers...',
  GOV24: 'Verifying 4 certifications, 2 degrees...',
};

const PROVIDERS: {
  id: DataSourceConnection['provider'];
  name: string;
  description: string;
}[] = [
  {
    id: 'GITHUB',
    name: 'GitHub',
    description:
      'Analyze your repositories, contributions, and coding activity to assess technical skills.',
  },
  {
    id: 'SLACK',
    name: 'Slack',
    description:
      'Evaluate communication patterns and collaboration style from workspace interactions.',
  },
  {
    id: 'DISCORD',
    name: 'Discord',
    description:
      'Review community engagement and technical discussions across servers.',
  },
  {
    id: 'GOV24',
    name: 'Gov24',
    description:
      'Verify certifications, education credentials, and official records.',
  },
];

function formatSyncTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getNextSyncDate(lastSynced: string) {
  const d = new Date(lastSynced);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DatasourcePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<DataSourceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectPhases, setConnectPhases] = useState<Record<string, ConnectPhase>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState('');

  useEffect(() => {
    if (user && user.role !== 'SEEKER') router.replace('/dashboard/employer');
  }, [user, router]);

  useEffect(() => {
    getDatasourceStatus()
      .then(setConnections)
      .finally(() => setLoading(false));

    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) {
      getDatasourceStatus().then(setConnections);
    }
  }, []);

  const handleConnect = useCallback(async (provider: string) => {
    setConnectPhases((prev) => ({ ...prev, [provider]: 'connecting' }));

    try {
      if (!USE_DUMMY && provider === 'GITHUB') {
        connectGithubOAuth();
        return;
      }

      await new Promise((r) => setTimeout(r, 800));

      setConnectPhases((prev) => ({ ...prev, [provider]: 'syncing' }));
      await new Promise((r) => setTimeout(r, 1500));

      const result = await connectDatasourceMock(provider);
      setConnections((prev) => {
        const existing = prev.findIndex((c) => c.provider === provider);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = result;
          return updated;
        }
        return [...prev, result];
      });

      setConnectPhases((prev) => ({ ...prev, [provider]: 'done' }));
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error('Failed to connect datasource:', err);
    } finally {
      setConnectPhases((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
    }
  }, []);

  const handleSyncAll = useCallback(async () => {
    const connectedProviders = connections
      .filter((c) => c.status === 'CONNECTED' || c.status === 'MOCK')
      .map((c) => c.provider);
    if (connectedProviders.length === 0) return;

    setSyncingAll(true);
    for (let i = 0; i < connectedProviders.length; i++) {
      const provider = connectedProviders[i];
      const name = PROVIDERS.find((p) => p.id === provider)?.name ?? provider;
      setSyncAllProgress(`Syncing ${name}... (${i + 1}/${connectedProviders.length})`);
      setConnectPhases((prev) => ({ ...prev, [provider]: 'syncing' }));
      await new Promise((r) => setTimeout(r, 1200));
      setConnectPhases((prev) => ({ ...prev, [provider]: 'done' }));
      await new Promise((r) => setTimeout(r, 500));
      setConnectPhases((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
    }
    setSyncAllProgress('');
    setSyncingAll(false);
  }, [connections]);

  const toggleExpand = (providerId: string) => {
    setExpanded((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  function getConnectionStatus(provider: string): DataSourceConnection | undefined {
    return connections.find((c) => c.provider === provider);
  }

  const connectedCount = connections.filter(
    (c) => c.status === 'CONNECTED' || c.status === 'MOCK'
  ).length;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            Data Sources
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Connect your accounts to let AI analyze your professional profile.{' '}
            {connectedCount} of {PROVIDERS.length} sources connected.
          </p>
        </div>
        {/* Sync All Button */}
        {connectedCount > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <span className={`material-symbols-outlined text-base ${syncingAll ? 'animate-spin' : ''}`}>
              {syncingAll ? 'progress_activity' : 'sync'}
            </span>
            {syncingAll ? syncAllProgress : 'Sync All Connected Sources'}
          </button>
        )}
      </div>

      {/* AI Nudge */}
      {connectedCount === 0 && (
        <AINudge id="ds-zero" message="Start with GitHub — it gives the most comprehensive technical profile." />
      )}
      {connectedCount === 1 && (
        <AINudge id="ds-one" message="Great start! Adding Slack reveals your collaboration style." ctaLabel="Connect Slack" ctaHref="/datasource" />
      )}
      {connectedCount === 3 && (
        <AINudge id="ds-three" message="One more source to go. Gov24 verifies your credentials on-chain." />
      )}
      {connectedCount >= 4 && (
        <AINudge id="ds-all" message="All sources connected. Your AI profile updates automatically every day." />
      )}

      {/* Auto-sync banner */}
      {connectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4">
          <span
            className="material-symbols-outlined text-primary text-xl shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            autorenew
          </span>
          <p className="text-base text-foreground/80">
            Your data sources sync automatically every day. AI keeps your profile fresh without any manual work.
          </p>
        </div>
      )}

      {/* Progress indicator */}
      <div className="rounded-2xl border border-border/10 bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold text-foreground">
            Connection Progress
          </span>
          <span className="text-sm text-muted-foreground">
            {connectedCount}/{PROVIDERS.length}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(connectedCount / PROVIDERS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Provider Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/10 bg-card p-6 h-52 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PROVIDERS.map((provider) => {
            const connection = getConnectionStatus(provider.id);
            const isConnected =
              connection?.status === 'CONNECTED' ||
              connection?.status === 'MOCK';
            const phase = connectPhases[provider.id];
            const isConnecting = !!phase;
            const isExpanded = expanded[provider.id] ?? false;

            return (
              <div
                key={provider.id}
                className={`rounded-2xl border bg-card transition-all duration-300 ${
                  phase === 'done'
                    ? 'border-emerald-500/30'
                    : isConnected
                      ? 'border-border/10 hover:border-border/20'
                      : 'border-border/10 hover:border-border/20'
                }`}
              >
                <div className="p-6 flex flex-col gap-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                          phase === 'done'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : isConnected
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {phase === 'done' ? (
                          <span
                            className="material-symbols-outlined text-2xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            check_circle
                          </span>
                        ) : providerIcons[provider.id] ? (
                          providerIcons[provider.id]
                        ) : (
                          <span
                            className="material-symbols-outlined text-2xl"
                            style={
                              isConnected
                                ? { fontVariationSettings: "'FILL' 1" }
                                : undefined
                            }
                          >
                            assured_workload
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-[var(--font-manrope)] font-bold text-foreground">
                          {provider.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                            phase === 'done'
                              ? 'text-emerald-400'
                              : isConnected
                                ? 'text-emerald-400'
                                : isConnecting
                                  ? 'text-amber-400'
                                  : 'text-muted-foreground'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              phase === 'done'
                                ? 'bg-emerald-400'
                                : isConnected
                                  ? 'bg-emerald-400'
                                  : isConnecting
                                    ? 'bg-amber-400 animate-pulse'
                                    : 'bg-muted-foreground/40'
                            }`}
                          />
                          {phase === 'done'
                            ? 'Connected!'
                            : phase === 'syncing'
                              ? 'Syncing data...'
                              : phase === 'connecting'
                                ? 'Connecting...'
                                : isConnected
                                  ? 'Connected'
                                  : 'Disconnected'}
                        </span>
                      </div>
                    </div>

                    {/* Expand toggle for connected sources */}
                    {isConnected && !isConnecting && (
                      <button
                        onClick={() => toggleExpand(provider.id)}
                        className="p-1 rounded-lg hover:bg-muted transition-colors"
                      >
                        <span
                          className="material-symbols-outlined text-xl text-muted-foreground transition-transform duration-300"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          expand_more
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Description or sync status */}
                  {phase === 'syncing' ? (
                    <p className="text-base text-amber-400/80 leading-relaxed flex-1 animate-pulse">
                      {SYNC_STATS[provider.id]}
                    </p>
                  ) : phase === 'done' ? (
                    <p className="text-base text-emerald-400/80 leading-relaxed flex-1">
                      Data collection complete. Your profile is being updated.
                    </p>
                  ) : (
                    <p className="text-base text-muted-foreground leading-relaxed flex-1">
                      {provider.description}
                    </p>
                  )}

                  {/* Auto-sync schedule (for connected sources) */}
                  {isConnected && !isConnecting && connection?.lastSyncedAt && !isExpanded && (
                    <div className="rounded-lg bg-[#060610] border border-border/5 px-4 py-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        Auto-sync: Daily at 9:00 AM KST
                      </div>
                      <p className="text-sm text-muted-foreground/50">
                        Last synced: {formatSyncTime(connection.lastSyncedAt)}
                      </p>
                    </div>
                  )}

                  {/* Connect button — only for disconnected sources */}
                  {!isConnected && (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isConnecting ? (
                        <>
                          <span className="material-symbols-outlined text-base animate-spin">
                            progress_activity
                          </span>
                          {phase === 'syncing'
                            ? 'Syncing data...'
                            : phase === 'done'
                              ? 'Connected!'
                              : 'Connecting...'}
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">
                            link
                          </span>
                          Connect
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Expandable Panel — collected data details */}
                {isConnected && isExpanded && (
                  <div className="border-t border-border/10 px-6 py-5">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      Collected Data
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {COLLECTED_DATA[provider.id]?.map((item) => (
                        <div key={item.label} className="flex items-center gap-3 rounded-lg bg-[#060610] border border-border/5 px-3 py-2.5">
                          <span className="material-symbols-outlined text-base text-primary/70">
                            {item.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm text-muted-foreground truncate">{item.label}</p>
                            <p className="text-base font-semibold text-foreground">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {connection?.lastSyncedAt && (
                      <div className="mt-4 pt-3 border-t border-border/5 flex items-center justify-between text-sm text-muted-foreground/50">
                        <span>Last synced: {formatSyncTime(connection.lastSyncedAt)}</span>
                        <span>Next sync: {getNextSyncDate(connection.lastSyncedAt)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
