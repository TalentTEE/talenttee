'use client';

import { DataSourceConnection } from '@/lib/types';
import Link from 'next/link';

const providerMeta: Record<string, { label: string; icon: string }> = {
  github: { label: 'GitHub', icon: 'code' },
  slack: { label: 'Slack', icon: 'chat' },
  discord: { label: 'Discord', icon: 'forum' },
  gov24: { label: 'Gov24', icon: 'assured_workload' },
};

export function DatasourceStatus({ connections }: { connections: DataSourceConnection[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Data Sources</h3>
        <Link
          href="/datasource"
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          Add Source
        </Link>
      </div>
      <div className="flex gap-3 flex-wrap">
        {connections.map((c) => {
          const meta = providerMeta[c.provider] || { label: c.provider, icon: 'link' };
          const connected = c.status !== 'DISCONNECTED';
          return (
            <div
              key={c.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                connected
                  ? 'bg-primary/5 border-primary/20 text-primary'
                  : 'bg-muted border-border/10 text-muted-foreground'
              }`}
            >
              <span className="material-symbols-outlined text-base">{meta.icon}</span>
              <span className="text-sm font-medium">{meta.label}</span>
              {connected ? (
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              ) : (
                <span className="material-symbols-outlined text-sm">cancel</span>
              )}
            </div>
          );
        })}
        {connections.length === 0 && (
          <p className="text-sm text-muted-foreground">No connected data sources.</p>
        )}
      </div>
    </div>
  );
}
