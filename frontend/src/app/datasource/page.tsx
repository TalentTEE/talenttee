'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DataSourceConnection, DatasourceDetail } from '@/lib/types';
import { getDatasourceStatus, getDatasourceData, connectDatasourceMock, connectGithubOAuth, USE_DUMMY } from '@/lib/api';
import { GitHubConnectDialog } from '@/components/datasource/github-connect-dialog';
import { SlackConnectDialog } from '@/components/datasource/slack-connect-dialog';
import { DiscordConnectDialog } from '@/components/datasource/discord-connect-dialog';
import { Gov24ConnectDialog } from '@/components/datasource/gov24-connect-dialog';
import { useToast } from '@/components/ui/toast-provider';

const PROVIDERS: { id: DataSourceConnection['provider']; label: string; icon: string }[] = [
  { id: 'GITHUB', label: 'GitHub', icon: 'code' },
  { id: 'SLACK', label: 'Slack', icon: 'chat' },
  { id: 'DISCORD', label: 'Discord', icon: 'forum' },
  { id: 'GOV24', label: 'Gov24', icon: 'assured_workload' },
];

export default function DatasourcePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [connections, setConnections] = useState<DataSourceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'SEEKER') router.replace('/dashboard/employer');
  }, [user, router]);

  const fetchConnections = useCallback(async () => {
    try {
      const data = await getDatasourceStatus();
      setConnections(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const connectionMap = new Map(connections.map((c) => [c.provider, c]));
  const connectedCount = connections.filter((c) => c.status === 'CONNECTED' || c.status === 'MOCK').length;

  const openConnectDialog = (provider: string) => {
    if (!USE_DUMMY && provider === 'GITHUB') {
      connectGithubOAuth();
      return;
    }
    setDialogOpen(provider);
  };

  const handleDialogConnect = useCallback(async (provider: string) => {
    await connectDatasourceMock(provider);
    await fetchConnections();
  }, [fetchConnections]);

  const handleResync = useCallback(async (provider: string) => {
    setSyncing((prev) => ({ ...prev, [provider]: true }));
    try {
      await getDatasourceData(provider);
      addToast(`${provider} data refreshed.`, 'success');
    } catch {
      addToast(`Failed to refresh ${provider}.`, 'error');
    } finally {
      setSyncing((prev) => ({ ...prev, [provider]: false }));
    }
  }, [addToast]);

  const handleDisconnect = () => {
    addToast('Disconnect coming soon.', 'info');
  };

  function formatTime(dateStr?: string) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto py-10 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 bg-muted rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-10 px-4">
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-bold text-foreground">Data Sources</h1>
        <p className="text-sm text-muted-foreground mt-1">{connectedCount} of {PROVIDERS.length} connected</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PROVIDERS.map((provider) => {
          const conn = connectionMap.get(provider.id);
          const connected = conn && conn.status !== 'DISCONNECTED';
          const isSyncing = syncing[provider.id];

          return (
            <div
              key={provider.id}
              className={`rounded-2xl border p-5 transition-all ${
                connected
                  ? 'bg-[#00F0FF]/[0.03] border-[#00F0FF]/15'
                  : 'bg-card border-border/10'
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  connected ? 'bg-[#00F0FF]/10' : 'bg-muted/50'
                }`}>
                  <span className={`material-symbols-outlined text-lg ${
                    connected ? 'text-[#00F0FF]' : 'text-muted-foreground'
                  }`}>
                    {provider.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground">{provider.label}</span>
                  {connected ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-400">Connected</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Not connected</p>
                  )}
                </div>
              </div>

              {/* Body */}
              {connected ? (
                <div className="space-y-3">
                  {conn?.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last synced: {formatTime(conn.lastSyncedAt)}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResync(provider.id)}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                      {isSyncing ? 'Syncing...' : 'Resync'}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">link_off</span>
                      Disconnect
                    </button>
                  </div>
                </div>
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
