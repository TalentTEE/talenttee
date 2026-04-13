'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getDatasourceStatus, connectDatasourceMock, connectGithubOAuth, USE_DUMMY } from '@/lib/api';
import { DataSourceConnection } from '@/lib/types';

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
  icon: string;
  description: string;
}[] = [
  {
    id: 'GITHUB',
    name: 'GitHub',
    icon: 'code',
    description:
      'Analyze your repositories, contributions, and coding activity to assess technical skills.',
  },
  {
    id: 'SLACK',
    name: 'Slack',
    icon: 'chat',
    description:
      'Evaluate communication patterns and collaboration style from workspace interactions.',
  },
  {
    id: 'DISCORD',
    name: 'Discord',
    icon: 'forum',
    description:
      'Review community engagement and technical discussions across servers.',
  },
  {
    id: 'GOV24',
    name: 'Gov24',
    icon: 'assured_workload',
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

      // Phase 1: Connecting (800ms)
      await new Promise((r) => setTimeout(r, 800));

      // Phase 2: Syncing data
      setConnectPhases((prev) => ({ ...prev, [provider]: 'syncing' }));
      await new Promise((r) => setTimeout(r, 1500));

      // Phase 3: Actually connect
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

      // Phase 3: Show done briefly
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

  function getConnectionStatus(provider: string): DataSourceConnection | undefined {
    return connections.find((c) => c.provider === provider);
  }

  const connectedCount = connections.filter(
    (c) => c.status === 'CONNECTED' || c.status === 'MOCK'
  ).length;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Data Sources
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your accounts to let AI analyze your professional profile.{' '}
          {connectedCount} of {PROVIDERS.length} sources connected.
        </p>
      </div>

      {/* Auto-sync banner */}
      {connectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4">
          <span
            className="material-symbols-outlined text-primary text-xl shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            autorenew
          </span>
          <p className="text-sm text-foreground/80">
            Your data sources sync automatically every day. AI keeps your profile fresh without any manual work.
          </p>
        </div>
      )}

      {/* Progress indicator */}
      <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">
            Connection Progress
          </span>
          <span className="text-xs text-muted-foreground">
            {connectedCount}/{PROVIDERS.length}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#262626]">
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
              className="rounded-2xl border border-border/10 bg-[#1a1919] p-6 h-52 animate-pulse"
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

            return (
              <div
                key={provider.id}
                className={`rounded-2xl border bg-[#1a1919] p-6 flex flex-col gap-4 transition-all duration-300 ${
                  phase === 'done'
                    ? 'border-emerald-500/30'
                    : isConnected
                      ? 'border-border/10 hover:border-border/20'
                      : 'border-border/10 hover:border-border/20'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                        phase === 'done'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isConnected
                            ? 'bg-primary/10 text-primary'
                            : 'bg-[#262626] text-muted-foreground'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={
                          isConnected || phase === 'done'
                            ? { fontVariationSettings: "'FILL' 1" }
                            : undefined
                        }
                      >
                        {phase === 'done' ? 'check_circle' : provider.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-[var(--font-manrope)] font-bold text-foreground">
                        {provider.name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
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
                </div>

                {/* Description or sync status */}
                {phase === 'syncing' ? (
                  <p className="text-sm text-amber-400/80 leading-relaxed flex-1 animate-pulse">
                    {SYNC_STATS[provider.id]}
                  </p>
                ) : phase === 'done' ? (
                  <p className="text-sm text-emerald-400/80 leading-relaxed flex-1">
                    Data collection complete. Your profile is being updated.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {provider.description}
                  </p>
                )}

                {/* Auto-sync schedule (for connected sources) */}
                {isConnected && !isConnecting && connection?.lastSyncedAt && (
                  <div className="rounded-lg bg-[#141414] border border-border/5 px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Auto-sync: Daily at 9:00 AM KST
                    </div>
                    <p className="text-xs text-muted-foreground/50">
                      Last synced: {formatSyncTime(connection.lastSyncedAt)}
                    </p>
                    <p className="text-xs text-muted-foreground/50">
                      Next sync: {getNextSyncDate(connection.lastSyncedAt)}
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => handleConnect(provider.id)}
                  disabled={isConnecting}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isConnected
                      ? 'bg-[#201f1f] text-muted-foreground hover:text-foreground hover:bg-[#262626]'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                  ) : isConnected ? (
                    <>
                      <span className="material-symbols-outlined text-base">
                        sync
                      </span>
                      Re-sync Data
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
