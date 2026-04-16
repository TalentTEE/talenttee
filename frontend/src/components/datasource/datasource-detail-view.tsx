'use client';

import type { DatasourceDetail, GitHubData, SlackData, DiscordData, Gov24Data } from '@/lib/types';

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  Rust: '#dea584',
  Python: '#3572A5',
  JavaScript: '#f1e05a',
  Solidity: '#AA6746',
};

interface Props {
  provider: string;
  data: DatasourceDetail;
}

export function DatasourceDetailView({ provider, data }: Props) {
  switch (provider) {
    case 'GITHUB':
      return <GitHubDetail data={data as GitHubData} />;
    case 'SLACK':
      return <SlackDetail data={data as SlackData} />;
    case 'DISCORD':
      return <DiscordDetail data={data as DiscordData} />;
    case 'GOV24':
      return <Gov24Detail data={data as Gov24Data} />;
    default:
      return null;
  }
}

function GitHubDetail({ data }: { data: GitHubData }) {
  return (
    <div className="space-y-4 pt-4 mt-4 border-t border-border/10">
      {/* Repositories */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Repositories ({data.repositories.length})
        </h4>
        <div className="space-y-1.5">
          {data.repositories.map((repo) => (
            <div key={repo.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{repo.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[repo.language] ?? '#8b8b8b' }} />
                    {repo.language}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{repo.description}</p>
              </div>
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0 ml-3">
                <span className="material-symbols-outlined text-xs">star</span>
                {repo.stars}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Contributions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Commits', value: data.contributions.total_commits_last_year },
          { label: 'PRs Merged', value: data.contributions.prs_merged },
          { label: 'Issues', value: data.contributions.issues_closed },
          { label: 'Reviews', value: data.contributions.code_reviews },
        ].map((stat) => (
          <div key={stat.label} className="text-center px-3 py-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Languages */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Languages</h4>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(data.languages).map((lang) => (
            <span key={lang} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[lang] ?? '#8b8b8b' }} />
              {lang}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlackDetail({ data }: { data: SlackData }) {
  return (
    <div className="space-y-4 pt-4 mt-4 border-t border-border/10">
      {/* Communication Style */}
      {data.analysis && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Clarity', value: data.analysis.communicationStyle.clarity },
            { label: 'Technical', value: data.analysis.communicationStyle.technicalDepth },
            { label: 'Proactive', value: data.analysis.communicationStyle.proactiveness },
          ].map((s) => (
            <div key={s.label} className="text-center px-3 py-2 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Messages */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Recent Messages ({data.messages.length})
        </h4>
        <div className="space-y-1.5">
          {data.messages.slice(0, 3).map((msg) => (
            <div key={msg.id} className="px-3 py-2 rounded-lg bg-muted/30">
              <span className="text-xs font-medium text-[#00F0FF]">{msg.channel}</span>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{msg.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Work Areas */}
      {data.analysis && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work Areas</h4>
          <div className="flex flex-wrap gap-1.5">
            {data.analysis.workAreas.map((area) => (
              <span key={area.area} className="px-2.5 py-1 rounded-md bg-muted/30 text-xs text-muted-foreground">
                {area.area}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiscordDetail({ data }: { data: DiscordData }) {
  return (
    <div className="space-y-4 pt-4 mt-4 border-t border-border/10">
      {/* Servers */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Servers ({data.activities.length})
        </h4>
        <div className="space-y-1.5">
          {data.activities.map((act) => (
            <div key={act.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">{act.server}</span>
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF]">{act.role}</span>
              </div>
              <div className="text-right text-xs text-muted-foreground shrink-0 ml-3">
                <p>{act.messages_count} msgs</p>
                <p>{act.helpful_answers} helpful</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community Impact */}
      {data.analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Servers', value: data.analysis.communityImpact.totalServers },
            { label: 'Messages', value: data.analysis.communityImpact.totalMessages },
            { label: 'Helpful', value: data.analysis.communityImpact.totalHelpful },
            { label: 'Help %', value: `${data.analysis.communityImpact.helpfulRatio}%` },
          ].map((s) => (
            <div key={s.label} className="text-center px-3 py-2 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Gov24Detail({ data }: { data: Gov24Data }) {
  return (
    <div className="space-y-4 pt-4 mt-4 border-t border-border/10">
      {/* Certificates */}
      {data.certificates.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Certificates</h4>
          <div className="space-y-1.5">
            {data.certificates.map((cert) => (
              <div key={cert.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground">{cert.name}</span>
                  <p className="text-xs text-muted-foreground">{cert.issuer} &middot; {cert.issued_date}</p>
                </div>
                <span className="text-xs text-emerald-400 shrink-0 ml-3">{cert.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Education</h4>
          <div className="space-y-1.5">
            {data.education.map((edu) => (
              <div key={edu.institution} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground">{edu.degree}</span>
                  <p className="text-xs text-muted-foreground">{edu.institution}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-3">{edu.graduation_year}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
