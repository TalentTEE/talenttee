'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getDatasourceStatus, getDatasourceData, connectDatasourceMock, connectGithubOAuth, generateResume, USE_DUMMY, getGithubRepos, toggleGithubRepo, startGithubSync, getGithubSyncStatus } from '@/lib/api';
import { DataSourceConnection, DatasourceDetail, GitHubData, SlackData, DiscordData, Gov24Data } from '@/lib/types';
import type { GithubRepository, GithubSyncStatus } from '@/lib/types';
import { AINudge } from '@/components/ui/AINudge';
import { GitHubConnectDialog } from '@/components/datasource/github-connect-dialog';
import { SlackConnectDialog } from '@/components/datasource/slack-connect-dialog';
import { DiscordConnectDialog } from '@/components/datasource/discord-connect-dialog';
import { Gov24ConnectDialog } from '@/components/datasource/gov24-connect-dialog';

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
  GITHUB: <GitHubIcon className="w-5 h-5" />,
  SLACK: <SlackIcon className="w-5 h-5" />,
  DISCORD: <DiscordIcon className="w-5 h-5" />,
};

const PROVIDERS: {
  id: DataSourceConnection['provider'];
  name: string;
  description: string;
}[] = [
  { id: 'GITHUB', name: 'GitHub', description: 'Repositories, contributions, and coding activity' },
  { id: 'SLACK', name: 'Slack', description: 'Communication patterns and collaboration style' },
  { id: 'DISCORD', name: 'Discord', description: 'Community engagement and technical discussions' },
  { id: 'GOV24', name: 'Gov24', description: 'Certifications and education credentials' },
];

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Rust: '#dea584', Python: '#3572A5',
  Solidity: '#AA6746', Go: '#00ADD8', Java: '#b07219', 'C++': '#f34b7d',
};

function formatSyncTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ── Shared Analysis UI Components ── */

function LevelBar({ label, level, evidence }: { label: string; level: number; evidence: string }) {
  const color = level >= 85 ? 'bg-primary' : level >= 70 ? 'bg-sky-500' : 'bg-slate-500';
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-foreground font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{level}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${level}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground/60 mt-1 leading-snug opacity-0 group-hover:opacity-100 transition-opacity">{evidence}</p>
    </div>
  );
}

function CollapsibleRawData({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5 pt-4 border-t border-border/10">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
        <span className="material-symbols-outlined text-sm transition-transform duration-200" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          chevron_right
        </span>
        Raw Data
      </button>
      {open && <div className="mt-3 space-y-4">{children}</div>}
    </div>
  );
}

/* ── Provider-specific Detail Panels ── */

function GitHubDetail({ data }: { data: GitHubData }) {
  const totalBytes = Object.values(data.languages).reduce((a, b) => a + b, 0);
  const langEntries = Object.entries(data.languages).sort(([, a], [, b]) => b - a).slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Analysis Section */}
      {data.analysis && (
        <>
          {/* Skills */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Skills</p>
            <div className="space-y-3">
              {data.analysis.skills.map((s) => (
                <LevelBar key={s.name} label={s.name} level={s.level} evidence={s.evidence} />
              ))}
            </div>
          </div>

          {/* Projects */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Projects</p>
            <div className="space-y-2">
              {data.analysis.projects.map((p) => (
                <div key={p.name} className="rounded-lg bg-[#060610] border border-border/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{p.name}</span>
                    <span className="text-xs text-primary/80 font-medium">{p.role}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.skills.map((sk) => (
                      <span key={sk} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80">{sk}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.impact}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Work Patterns */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Work Patterns</p>
            <div className="space-y-2">
              {data.analysis.workPatterns.map((w) => (
                <div key={w.trait} className="flex items-start gap-2.5 rounded-lg bg-[#060610] border border-border/5 px-4 py-3">
                  <span className="material-symbols-outlined text-sm text-primary/70 mt-0.5 shrink-0">trending_up</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{w.trait}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{w.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Raw Data */}
      <CollapsibleRawData>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="material-symbols-outlined text-base">person</span>
          <span className="font-medium text-foreground">{data.profile.name ?? data.profile.login}</span>
          <span>&middot;</span>
          <span>{data.profile.public_repos} repos</span>
          <span>&middot;</span>
          <span>{data.profile.followers} followers</span>
        </div>

        {totalBytes > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Languages</p>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
              {langEntries.map(([lang, bytes]) => (
                <div key={lang} className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(bytes / totalBytes) * 100}%`, backgroundColor: LANG_COLORS[lang] ?? '#8b8b8b' }}
                  title={`${lang}: ${((bytes / totalBytes) * 100).toFixed(1)}%`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {langEntries.map(([lang, bytes]) => (
                <span key={lang} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[lang] ?? '#8b8b8b' }} />
                  {lang} {((bytes / totalBytes) * 100).toFixed(1)}%
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Repositories</p>
          <div className="grid grid-cols-1 gap-2">
            {data.repositories.map((repo) => (
              <div key={repo.name} className="rounded-lg bg-[#060610] border border-border/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{repo.name}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[repo.language] ?? '#8b8b8b' }} />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">star</span>{repo.stars}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">call_split</span>{repo.forks}
                    </span>
                  </div>
                </div>
                {repo.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{repo.description}</p>}
                {repo.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {repo.topics.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: 'commit', label: 'Commits', value: data.contributions.total_commits_last_year.toLocaleString() },
            { icon: 'merge_type', label: 'PRs Merged', value: data.contributions.prs_merged.toLocaleString() },
            { icon: 'bug_report', label: 'Issues Closed', value: data.contributions.issues_closed.toLocaleString() },
            { icon: 'rate_review', label: 'Code Reviews', value: data.contributions.code_reviews.toLocaleString() },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 rounded-lg bg-[#060610] border border-border/5 px-3 py-2.5">
              <span className="material-symbols-outlined text-base text-primary/70">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleRawData>
    </div>
  );
}

function SlackDetail({ data }: { data: SlackData }) {
  const channelMap = new Map<string, typeof data.messages>();
  for (const msg of data.messages) {
    const list = channelMap.get(msg.channel) ?? [];
    list.push(msg);
    channelMap.set(msg.channel, list);
  }
  const channels = Array.from(channelMap.entries());

  return (
    <div className="space-y-5">
      {/* Analysis Section */}
      {data.analysis && (
        <>
          {/* Communication Style */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Communication Style</p>
            <div className="space-y-3">
              {Object.entries(data.analysis.communicationStyle).map(([key, val]) => {
                const labels: Record<string, string> = { clarity: 'Clarity', technicalDepth: 'Technical Depth', proactiveness: 'Proactiveness' };
                return <LevelBar key={key} label={labels[key] ?? key} level={val} evidence="" />;
              })}
            </div>
          </div>

          {/* Traits */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Traits</p>
            <div className="space-y-3">
              {data.analysis.traits.map((t) => (
                <LevelBar key={t.trait} label={t.trait} level={t.level} evidence={t.evidence} />
              ))}
            </div>
          </div>

          {/* Work Areas */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Work Areas</p>
            <div className="space-y-2">
              {data.analysis.workAreas.map((wa) => (
                <div key={wa.area} className="rounded-lg bg-[#060610] border border-border/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{wa.area}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{wa.messageCount} msgs</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {wa.keywords.map((kw) => (
                      <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80">{kw}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Raw Data */}
      <CollapsibleRawData>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="material-symbols-outlined text-base">chat_bubble</span>
          <span>{data.messages.length} messages across {channels.length} channels</span>
        </div>
        {channels.map(([channel, msgs]) => (
          <div key={channel}>
            <p className="text-xs font-semibold text-primary/80 mb-2">{channel}</p>
            <div className="space-y-2">
              {msgs.map((msg) => (
                <div key={msg.id} className="rounded-lg bg-[#060610] border border-border/5 px-4 py-3">
                  <p className="text-sm text-foreground/90 line-clamp-2">{msg.text}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    {new Date(msg.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CollapsibleRawData>
    </div>
  );
}

function DiscordDetail({ data }: { data: DiscordData }) {
  const totalMessages = data.activities.reduce((s, a) => s + a.messages_count, 0);
  const totalHelpful = data.activities.reduce((s, a) => s + a.helpful_answers, 0);

  return (
    <div className="space-y-5">
      {/* Analysis Section */}
      {data.analysis && (
        <>
          {/* Community Impact Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: 'dns', label: 'Servers', value: String(data.analysis.communityImpact.totalServers) },
              { icon: 'chat_bubble', label: 'Messages', value: data.analysis.communityImpact.totalMessages.toLocaleString() },
              { icon: 'thumb_up', label: 'Helpful', value: String(data.analysis.communityImpact.totalHelpful) },
              { icon: 'percent', label: 'Help Rate', value: `${data.analysis.communityImpact.helpfulRatio}%` },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 rounded-lg bg-[#060610] border border-border/5 px-3 py-2.5">
                <span className="material-symbols-outlined text-base text-primary/70">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Traits */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Traits</p>
            <div className="space-y-3">
              {data.analysis.traits.map((t) => (
                <LevelBar key={t.trait} label={t.trait} level={t.level} evidence={t.evidence} />
              ))}
            </div>
          </div>

          {/* Expertise */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Expertise</p>
            <div className="space-y-3">
              {data.analysis.expertise.map((e) => (
                <LevelBar key={e.domain} label={e.domain} level={e.confidence} evidence={e.source} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Raw Data */}
      <CollapsibleRawData>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">dns</span>{data.activities.length} servers
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">chat_bubble</span>{totalMessages.toLocaleString()} messages
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">thumb_up</span>{totalHelpful} helpful
          </span>
        </div>
        <div className="space-y-2">
          {data.activities.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-[#060610] border border-border/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{a.server}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.messages_count.toLocaleString()} messages &middot; {a.helpful_answers} helpful</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                a.role === 'Moderator' ? 'bg-amber-500/10 text-amber-400'
                  : a.role === 'Core Contributor' ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>{a.role}</span>
            </div>
          ))}
        </div>
      </CollapsibleRawData>
    </div>
  );
}

function Gov24Detail({ data }: { data: Gov24Data }) {
  return (
    <div className="space-y-5">
      {/* Analysis Section */}
      {data.analysis && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Qualifications</p>
          <div className="space-y-3">
            {data.analysis.qualifications.map((q) => (
              <LevelBar key={q.trait} label={q.trait} level={q.level} evidence={q.evidence} />
            ))}
          </div>
        </div>
      )}

      {/* Certifications & Education (kept as primary, not raw data) */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Certifications</p>
        <div className="space-y-2">
          {data.certificates.map((cert) => (
            <div key={cert.name} className="flex items-center justify-between rounded-lg bg-[#060610] border border-border/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{cert.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cert.issuer} &middot; {cert.issued_date}</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                {cert.status}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Education</p>
        <div className="space-y-2">
          {data.education.map((edu) => (
            <div key={edu.institution} className="flex items-center justify-between rounded-lg bg-[#060610] border border-border/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{edu.institution}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{edu.degree} &middot; {edu.graduation_year}</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                {edu.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Ability Summary ── */

interface AbilityItem {
  name: string;
  level: number;
  evidence: string;
  sources: string[];
}

function collectAbilities(detailData: Record<string, DatasourceDetail>): AbilityItem[] {
  const map = new Map<string, AbilityItem>();

  const merge = (name: string, level: number, evidence: string, source: string) => {
    const key = name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      if (level > existing.level) {
        existing.level = level;
        existing.evidence = evidence;
      }
      if (!existing.sources.includes(source)) existing.sources.push(source);
    } else {
      map.set(key, { name, level, evidence, sources: [source] });
    }
  };

  for (const [provider, data] of Object.entries(detailData)) {
    if (provider === 'GITHUB' && 'repositories' in data) {
      const d = data as GitHubData;
      d.analysis?.skills.forEach((s) => merge(s.name, s.level, s.evidence, 'GitHub'));
    }
    if (provider === 'SLACK' && 'messages' in data) {
      const d = data as SlackData;
      d.analysis?.traits.forEach((t) => merge(t.trait, t.level, t.evidence, 'Slack'));
    }
    if (provider === 'DISCORD' && 'activities' in data) {
      const d = data as DiscordData;
      d.analysis?.traits.forEach((t) => merge(t.trait, t.level, t.evidence, 'Discord'));
      d.analysis?.expertise.forEach((e) => merge(e.domain, e.confidence, e.source, 'Discord'));
    }
    if (provider === 'GOV24' && 'certificates' in data) {
      const d = data as Gov24Data;
      d.analysis?.qualifications.forEach((q) => merge(q.trait, q.level, q.evidence, 'Gov24'));
    }
  }

  return Array.from(map.values()).sort((a, b) => b.level - a.level);
}

function AbilitySummary({ detailData }: { detailData: Record<string, DatasourceDetail> }) {
  const [showAll, setShowAll] = useState(false);
  const abilities = collectAbilities(detailData);
  const sourceCount = Object.keys(detailData).length;

  if (abilities.length === 0) return null;

  const visible = showAll ? abilities : abilities.slice(0, 6);

  return (
    <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            emoji_events
          </span>
          <h2 className="font-[var(--font-manrope)] text-lg font-bold text-foreground">My Abilities</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          Based on {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
        </span>
      </div>

      <div className="space-y-4">
        {visible.map((ability) => (
          <div key={ability.name}>
            <LevelBar label={ability.name} level={ability.level} evidence={ability.evidence} />
            <div className="flex gap-1.5 mt-1.5">
              {ability.sources.map((src) => (
                <span key={src} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {src}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {abilities.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 mt-4 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <span className="material-symbols-outlined text-sm transition-transform duration-200"
            style={{ transform: showAll ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            expand_more
          </span>
          {showAll ? 'Show less' : `Show all ${abilities.length} abilities`}
        </button>
      )}
    </div>
  );
}

function DetailPanel({ provider, data }: { provider: string; data: DatasourceDetail }) {
  if (provider === 'GITHUB' && 'repositories' in data) return <GitHubDetail data={data as GitHubData} />;
  if (provider === 'SLACK' && 'messages' in data) return <SlackDetail data={data as SlackData} />;
  if (provider === 'DISCORD' && 'activities' in data) return <DiscordDetail data={data as DiscordData} />;
  if (provider === 'GOV24' && 'certificates' in data) return <Gov24Detail data={data as Gov24Data} />;
  return null;
}

/* ── Summary text for collapsed connected sources ── */
function getProviderSummary(provider: string, data?: DatasourceDetail): string {
  if (!data) return 'Connected';
  if (provider === 'GITHUB' && 'repositories' in data) {
    const d = data as GitHubData;
    return `${d.profile.public_repos} repos, ${d.contributions.total_commits_last_year} commits`;
  }
  if (provider === 'SLACK' && 'messages' in data) {
    const d = data as SlackData;
    const channels = new Set(d.messages.map((m) => m.channel));
    return `${d.messages.length} messages, ${channels.size} channels`;
  }
  if (provider === 'DISCORD' && 'activities' in data) {
    const d = data as DiscordData;
    const total = d.activities.reduce((s, a) => s + a.messages_count, 0);
    return `${d.activities.length} servers, ${total} messages`;
  }
  if (provider === 'GOV24' && 'certificates' in data) {
    const d = data as Gov24Data;
    return `${d.certificates.length} certs, ${d.education.length} degrees`;
  }
  return 'Connected';
}

export default function DatasourcePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<DataSourceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [detailData, setDetailData] = useState<Record<string, DatasourceDetail>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState('');
  const [githubRepos, setGithubRepos] = useState<GithubRepository[]>([]);
  const [syncStatus, setSyncStatus] = useState<GithubSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  /* Load GitHub repos for sync UI */
  useEffect(() => {
    const githubConn = connections.find((c) => c.provider === 'GITHUB');
    if (githubConn && (githubConn.status === 'CONNECTED' || githubConn.status === 'MOCK')) {
      getGithubRepos().then(setGithubRepos).catch(console.error);
    }
  }, [connections]);

  /* Auto-load detail data for connected providers (for AbilitySummary) */
  useEffect(() => {
    const connected = connections.filter((c) => c.status === 'CONNECTED' || c.status === 'MOCK');
    if (connected.length === 0) return;

    Promise.all(
      connected.map(async (c) => {
        if (detailData[c.provider]) return;
        try {
          const data = await getDatasourceData(c.provider);
          setDetailData((prev) => ({ ...prev, [c.provider]: data }));
        } catch {}
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections]);

  /* Dialog-based connect handlers */
  const handleDialogConnect = useCallback(async (provider: string) => {
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
    // Auto-trigger resume generation
    generateResume().catch(() => {});
  }, []);

  const openConnectDialog = (provider: string) => {
    if (!USE_DUMMY && provider === 'GITHUB') {
      connectGithubOAuth();
      return;
    }
    setDialogOpen(provider);
  };

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
      await new Promise((r) => setTimeout(r, 1200));
      // Refresh data
      try {
        const data = await getDatasourceData(provider);
        setDetailData((prev) => ({ ...prev, [provider]: data }));
      } catch {}
    }
    setSyncAllProgress('');
    setSyncingAll(false);
  }, [connections]);

  const toggleExpand = useCallback(async (providerId: string) => {
    const willExpand = !expanded[providerId];
    setExpanded((prev) => ({ ...prev, [providerId]: willExpand }));

    if (willExpand && !detailData[providerId]) {
      setDetailLoading((prev) => ({ ...prev, [providerId]: true }));
      try {
        const data = await getDatasourceData(providerId);
        setDetailData((prev) => ({ ...prev, [providerId]: data }));
      } catch (err) {
        console.error(`Failed to load ${providerId} data:`, err);
      } finally {
        setDetailLoading((prev) => ({ ...prev, [providerId]: false }));
      }
    }
  }, [expanded, detailData]);

  function getConnectionStatus(provider: string): DataSourceConnection | undefined {
    return connections.find((c) => c.provider === provider);
  }

  async function handleGithubSync(forceResume = false) {
    setSyncing(true);
    try {
      await startGithubSync(forceResume);
      const interval = setInterval(async () => {
        const status = await getGithubSyncStatus();
        setSyncStatus(status);
        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          clearInterval(interval);
          setSyncing(false);
          const repos = await getGithubRepos();
          setGithubRepos(repos);
        }
      }, 3000);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncing(false);
    }
  }

  async function handleToggleRepo(repoId: string, isActive: boolean) {
    try {
      const updated = await toggleGithubRepo(repoId, isActive);
      setGithubRepos((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      console.error('Toggle failed:', err);
    }
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
        {connectedCount > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <span className={`material-symbols-outlined text-base ${syncingAll ? 'animate-spin' : ''}`}>
              {syncingAll ? 'progress_activity' : 'sync'}
            </span>
            {syncingAll ? syncAllProgress : 'Sync All'}
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
        <AINudge id="ds-all" message="All sources connected. Your AI analysis is being generated automatically — check it on the Analysis page." ctaLabel="View Analysis" ctaHref="/analysis" />
      )}

      {/* Auto-sync banner */}
      {connectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4">
          <span className="material-symbols-outlined text-primary text-xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
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
          <span className="text-base font-semibold text-foreground">Connection Progress</span>
          <span className="text-sm text-muted-foreground">{connectedCount}/{PROVIDERS.length}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(connectedCount / PROVIDERS.length) * 100}%` }} />
        </div>
      </div>

      {/* Ability Summary */}
      {connectedCount > 0 && Object.keys(detailData).length > 0 && (
        <AbilitySummary detailData={detailData} />
      )}

      {/* Provider List — Collapsible Sections */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/10 bg-card p-5 h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {PROVIDERS.map((provider) => {
            const connection = getConnectionStatus(provider.id);
            const isConnected = connection?.status === 'CONNECTED' || connection?.status === 'MOCK';
            const isExpanded = expanded[provider.id] ?? false;

            return (
              <div key={provider.id} className="rounded-2xl border border-border/10 bg-card overflow-hidden">
                {/* Collapsible Header */}
                <div className="flex items-center">
                  <button
                    onClick={() => isConnected ? toggleExpand(provider.id) : openConnectDialog(provider.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 px-5 py-4 text-left group"
                  >
                    {/* Chevron (only for connected) */}
                    {isConnected ? (
                      <span
                        className="material-symbols-outlined text-lg text-muted-foreground/50 transition-transform duration-200 shrink-0"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      >
                        chevron_right
                      </span>
                    ) : (
                      <span className="w-[24px]" />
                    )}

                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isConnected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {providerIcons[provider.id] ?? (
                        <span className="material-symbols-outlined text-lg"
                          style={isConnected ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                          assured_workload
                        </span>
                      )}
                    </div>

                    {/* Name + status */}
                    <div className="min-w-0 flex-1">
                      <span className="font-[var(--font-manrope)] font-bold text-sm text-foreground">{provider.name}</span>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 ml-2 text-xs text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Connected
                        </span>
                      )}
                    </div>

                    {/* Summary or Connect label */}
                    <span className="text-xs text-muted-foreground/60 shrink-0 tabular-nums">
                      {isConnected
                        ? (connection?.lastSyncedAt
                            ? formatSyncTime(connection.lastSyncedAt)
                            : getProviderSummary(provider.id, detailData[provider.id]))
                        : provider.description
                      }
                    </span>
                  </button>

                  {/* Connect button for disconnected / sync button for connected */}
                  <div className="pr-4 shrink-0">
                    {isConnected ? (
                      <button
                        onClick={() => toggleExpand(provider.id)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="View details"
                      >
                        <span className="material-symbols-outlined text-lg text-muted-foreground/50 transition-transform duration-200"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          expand_more
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => openConnectDialog(provider.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">link</span>
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Content — slide down */}
                <div
                  className="grid transition-all duration-200 ease-out"
                  style={{ gridTemplateRows: isConnected && isExpanded ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-border/10 px-6 pb-5 pt-4">
                      {detailLoading[provider.id] ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                          <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                          <span className="text-sm">Loading data...</span>
                        </div>
                      ) : detailData[provider.id] ? (
                        <DetailPanel provider={provider.id} data={detailData[provider.id]} />
                      ) : (
                        <p className="text-sm text-muted-foreground/50 text-center py-4">No data available</p>
                      )}
                      {connection?.lastSyncedAt && (
                        <div className="mt-4 pt-3 border-t border-border/5 flex items-center justify-between text-sm text-muted-foreground/50">
                          <span>Last synced: {formatSyncTime(connection.lastSyncedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GitHub Repo Management */}
      {connections.some(
        (c) => c.provider === 'GITHUB' && (c.status === 'CONNECTED' || c.status === 'MOCK'),
      ) &&
        githubRepos.length > 0 && (
          <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-[var(--font-manrope)] text-lg font-bold text-foreground">
                  GitHub Repositories
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Select which repositories to include in your resume analysis.
                </p>
              </div>
              <button
                onClick={() => handleGithubSync(false)}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                    Syncing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">sync</span>
                    Sync Activity
                  </>
                )}
              </button>
            </div>

            {/* Sync Progress */}
            {syncing && syncStatus && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Syncing repositories...</span>
                  <span>
                    {syncStatus.completedRepos}/{syncStatus.totalRepos}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#262626]">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: `${syncStatus.totalRepos > 0 ? (syncStatus.completedRepos / syncStatus.totalRepos) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Repo List */}
            <div className="space-y-2">
              {githubRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#201f1f] hover:bg-[#262626] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleRepo(repo.id, !repo.isActive)}
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        repo.isActive
                          ? 'bg-primary border-primary'
                          : 'border-border/30 hover:border-border/60'
                      }`}
                    >
                      {repo.isActive && (
                        <span className="material-symbols-outlined text-sm text-primary-foreground">
                          check
                        </span>
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {repo.fullName}
                      </p>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {repo.language && (
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-[#1a1919]">
                        {repo.language}
                      </span>
                    )}
                    {repo.isPrivate && (
                      <span className="material-symbols-outlined text-sm text-muted-foreground/60">
                        lock
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
