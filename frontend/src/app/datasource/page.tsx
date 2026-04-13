'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getDatasourceStatus, connectDatasourceMock, connectGithubOAuth, USE_DUMMY } from '@/lib/api';
import { DataSourceConnection } from '@/lib/types';

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

export default function DatasourcePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<DataSourceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'SEEKER') router.replace('/dashboard/employer');
  }, [user, router]);

  useEffect(() => {
    getDatasourceStatus()
      .then(setConnections)
      .finally(() => setLoading(false));

    // Handle OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) {
      getDatasourceStatus().then(setConnections);
    }
  }, []);

  function getConnectionStatus(
    provider: string
  ): DataSourceConnection | undefined {
    return connections.find((c) => c.provider === provider);
  }

  async function handleConnect(provider: string) {
    setConnecting(provider);
    try {
      if (!USE_DUMMY && provider === 'GITHUB') {
        const { redirectUrl } = await connectGithubOAuth();
        window.location.href = redirectUrl;
        return;
      }

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
    } catch (err) {
      console.error('Failed to connect datasource:', err);
    } finally {
      setConnecting(null);
    }
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
            const isConnecting = connecting === provider.id;

            return (
              <div
                key={provider.id}
                className="rounded-2xl border border-border/10 bg-[#1a1919] p-6 flex flex-col gap-4 transition-all duration-200 hover:border-border/20"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isConnected
                          ? 'bg-primary/10 text-primary'
                          : 'bg-[#262626] text-muted-foreground'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={
                          isConnected
                            ? { fontVariationSettings: "'FILL' 1" }
                            : undefined
                        }
                      >
                        {provider.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-[var(--font-manrope)] font-bold text-foreground">
                        {provider.name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          isConnected
                            ? 'text-emerald-400'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isConnected
                              ? 'bg-emerald-400'
                              : 'bg-muted-foreground/40'
                          }`}
                        />
                        {isConnected
                          ? connection?.status === 'MOCK'
                            ? 'Mock Connected'
                            : 'Connected'
                          : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {provider.description}
                </p>

                {/* Last Synced */}
                {isConnected && connection?.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground/60">
                    Last synced:{' '}
                    {new Date(connection.lastSyncedAt).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </p>
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
                      Connecting...
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
