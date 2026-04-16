'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DataSourceConnection, DatasourceDetail, GitHubData, SlackData, DiscordData, Gov24Data } from '@/lib/types';
import { getDatasourceData, connectDatasourceMock, connectGithubOAuth, USE_DUMMY } from '@/lib/api';
import { GitHubConnectDialog } from '@/components/datasource/github-connect-dialog';
import { SlackConnectDialog } from '@/components/datasource/slack-connect-dialog';
import { DiscordConnectDialog } from '@/components/datasource/discord-connect-dialog';
import { Gov24ConnectDialog } from '@/components/datasource/gov24-connect-dialog';

const ALL_PROVIDERS: { id: DataSourceConnection['provider']; label: string; icon: string }[] = [
  { id: 'GITHUB', label: 'GitHub', icon: 'code' },
  { id: 'SLACK', label: 'Slack', icon: 'chat' },
  { id: 'DISCORD', label: 'Discord', icon: 'forum' },
  { id: 'GOV24', label: 'Gov24', icon: 'assured_workload' },
];

function LevelBar({ label, level }: { label: string; level: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-foreground/80 truncate flex-1 min-w-0">{label}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{level}</span>
      <div className="w-16 h-1 rounded-full bg-muted overflow-hidden shrink-0">
        <div
          className="h-full rounded-full bg-[#00F0FF] transition-all duration-500"
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}

function GitHubSummary({ data }: { data: GitHubData }) {
  const topSkills = data.analysis?.skills.slice(0, 2) ?? [];
  const commits = data.contributions.total_commits_last_year;
  return (
    <div className="space-y-2">
      {topSkills.map((s) => (
        <LevelBar key={s.name} label={s.name} level={s.level} />
      ))}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
        <span className="material-symbols-outlined text-xs">commit</span>
        <span>{commits.toLocaleString()} commits/year</span>
      </div>
    </div>
  );
}

function SlackSummary({ data }: { data: SlackData }) {
  const topTraits = data.analysis?.traits.slice(0, 2) ?? [];
  const clarity = data.analysis?.communicationStyle.clarity;
  return (
    <div className="space-y-2">
      {topTraits.map((t) => (
        <LevelBar key={t.trait} label={t.trait} level={t.level} />
      ))}
      {clarity !== undefined && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <span className="material-symbols-outlined text-xs">chat_bubble</span>
          <span>Clarity {clarity}%</span>
        </div>
      )}
    </div>
  );
}

function DiscordSummary({ data }: { data: DiscordData }) {
  const servers = data.activities.length;
  const totalHelpful = data.activities.reduce((s, a) => s + a.helpful_answers, 0);
  const topExpertise = data.analysis?.expertise[0];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">dns</span>
          {servers} servers
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">thumb_up</span>
          {totalHelpful} helpful
        </span>
      </div>
      {topExpertise && (
        <LevelBar label={topExpertise.domain} level={topExpertise.confidence} />
      )}
    </div>
  );
}

function Gov24Summary({ data }: { data: Gov24Data }) {
  const certs = data.certificates.slice(0, 2);
  const topEdu = data.education[0];
  return (
    <div className="space-y-1.5">
      {certs.map((c) => (
        <div key={c.name} className="flex items-center gap-1.5 text-xs text-foreground/80">
          <span className="material-symbols-outlined text-xs text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          <span className="truncate">{c.name}</span>
        </div>
      ))}
      {topEdu && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="material-symbols-outlined text-xs">school</span>
          <span className="truncate">{topEdu.degree}, {topEdu.institution}</span>
        </div>
      )}
    </div>
  );
}

function ProviderSummary({ provider, data }: { provider: string; data: DatasourceDetail }) {
  if (provider === 'GITHUB' && 'repositories' in data) return <GitHubSummary data={data as GitHubData} />;
  if (provider === 'SLACK' && 'messages' in data) return <SlackSummary data={data as SlackData} />;
  if (provider === 'DISCORD' && 'activities' in data) return <DiscordSummary data={data as DiscordData} />;
  if (provider === 'GOV24' && 'certificates' in data) return <Gov24Summary data={data as Gov24Data} />;
  return null;
}

function CardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-1 bg-muted rounded w-16 mt-1" />
    </div>
  );
}

interface DatasourceStatusProps {
  connections: DataSourceConnection[];
  onConnect?: () => void;
}

export function DatasourceStatus({ connections, onConnect }: DatasourceStatusProps) {
  const [detailData, setDetailData] = useState<Record<string, DatasourceDetail>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  useEffect(() => {
    const connected = connections.filter((c) => c.status === 'CONNECTED' || c.status === 'MOCK');
    if (connected.length === 0) return;

    const toFetch = connected.filter((c) => !detailData[c.provider]);
    if (toFetch.length === 0) return;

    const loadingState: Record<string, boolean> = {};
    toFetch.forEach((c) => { loadingState[c.provider] = true; });
    setLoading((prev) => ({ ...prev, ...loadingState }));

    Promise.all(
      toFetch.map(async (c) => {
        try {
          const data = await getDatasourceData(c.provider);
          setDetailData((prev) => ({ ...prev, [c.provider]: data }));
        } catch {
          // silently ignore fetch errors
        } finally {
          setLoading((prev) => ({ ...prev, [c.provider]: false }));
        }
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections]);

  const handleDialogConnect = useCallback(async (provider: string) => {
    await connectDatasourceMock(provider);
    onConnect?.();
  }, [onConnect]);

  const openConnectDialog = (provider: string) => {
    if (!USE_DUMMY && provider === 'GITHUB') {
      connectGithubOAuth();
      return;
    }
    setDialogOpen(provider);
  };

  const connectionMap = new Map(connections.map((c) => [c.provider, c]));

  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">My Profile</h3>
        <Link href="/datasource" className="text-xs text-[#00F0FF] hover:text-[#00F0FF]/80 font-medium transition-colors">
          Manage
        </Link>
      </div>

      {connections.length === 0 ? (
        <p className="text-base text-muted-foreground">No connected data sources.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_PROVIDERS.map((provider) => {
            const conn = connectionMap.get(provider.id);
            const connected = conn && conn.status !== 'DISCONNECTED';
            const isLoading = loading[provider.id];
            const data = detailData[provider.id];

            return (
              <div
                key={provider.id}
                className={`rounded-xl border p-4 transition-all ${
                  connected
                    ? 'bg-[#00F0FF]/[0.03] border-[#00F0FF]/15'
                    : 'bg-muted/30 border-border/10'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`material-symbols-outlined text-base ${
                      connected ? 'text-[#00F0FF]' : 'text-muted-foreground'
                    }`}
                  >
                    {provider.icon}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      connected ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {provider.label}
                  </span>
                  {connected ? (
                    <span
                      className="material-symbols-outlined text-sm text-[#00F0FF] ml-auto"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  ) : (
                    <button
                      onClick={() => openConnectDialog(provider.id)}
                      className="ml-auto text-xs text-[#00F0FF] hover:text-[#00F0FF]/80 font-medium transition-colors cursor-pointer"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {/* Body: summary or placeholder */}
                {connected ? (
                  isLoading ? (
                    <CardSkeleton />
                  ) : data ? (
                    <ProviderSummary provider={provider.id} data={data} />
                  ) : (
                    <p className="text-xs text-muted-foreground/50">No data</p>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground/40">Connect to see analysis</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Dialogs */}
      <GitHubConnectDialog
        open={dialogOpen === 'GITHUB'}
        onOpenChange={(val) => !val && setDialogOpen(null)}
        onConnect={async () => { await handleDialogConnect('GITHUB'); }}
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
    </div>
  );
}
