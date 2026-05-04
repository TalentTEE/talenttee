'use client';

import { useState } from 'react';
import type { DatasourceDetail, GitHubData, SlackData, DiscordData, Gov24Data, PdfData } from '@/lib/types';

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
  onSave?: (updated: PdfData) => Promise<void>;
}

export function DatasourceDetailView({ provider, data, onSave }: Props) {
  switch (provider) {
    case 'GITHUB':
      return <GitHubDetail data={data as GitHubData} />;
    case 'SLACK':
      return <SlackDetail data={data as SlackData} />;
    case 'DISCORD':
      return <DiscordDetail data={data as DiscordData} />;
    case 'GOV24':
      return <Gov24Detail data={data as Gov24Data} />;
    case 'PDF':
      return <PdfDetail data={data as PdfData} onSave={onSave} />;
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
            <div key={repo.name} className="px-3 py-2 rounded-xl bg-white/65 border border-border shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{repo.name}</span>
                    {repo.language && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[repo.language] ?? '#8b8b8b' }} />
                        {repo.language}
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{repo.description}</p>
                  )}
                </div>
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0 ml-3">
                  <span className="material-symbols-outlined text-xs">star</span>
                  {repo.stars}
                </span>
              </div>

              {(repo.userCommits !== undefined || repo.totalCommits !== undefined) && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <div className="rounded-lg bg-muted/60 px-2 py-1 text-center">
                    <p className="text-[10px] text-muted-foreground">My commits</p>
                    <p className="text-xs font-semibold text-foreground">{repo.userCommits ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-1 text-center">
                    <p className="text-[10px] text-muted-foreground">Total commits</p>
                    <p className="text-xs font-semibold text-foreground">{repo.totalCommits ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-1 text-center">
                    <p className="text-[10px] text-muted-foreground">Additions</p>
                    <p className="text-xs font-semibold text-foreground">{repo.additions ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-1 text-center">
                    <p className="text-[10px] text-muted-foreground">Deletions</p>
                    <p className="text-xs font-semibold text-foreground">{repo.deletions ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-1 text-center">
                    <p className="text-[10px] text-muted-foreground">Contribution</p>
                    <p className="text-xs font-semibold text-foreground">{((repo.contributionRatio ?? 0) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              )}
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
          <div key={stat.label} className="text-center px-3 py-2 rounded-xl bg-white/65 border border-border shadow-sm">
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
            <span key={lang} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/65 border border-border text-xs text-muted-foreground">
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
            <div key={s.label} className="text-center px-3 py-2 rounded-xl bg-white/65 border border-border shadow-sm">
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
            <div key={msg.id} className="px-3 py-2 rounded-xl bg-white/65 border border-border shadow-sm">
              <span className="text-xs font-bold text-primary">{msg.channel}</span>
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
              <span key={area.area} className="px-2.5 py-1 rounded-lg bg-white/65 border border-border text-xs text-muted-foreground">
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
            <div key={act.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/65 border border-border shadow-sm">
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">{act.server}</span>
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{act.role}</span>
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
            <div key={s.label} className="text-center px-3 py-2 rounded-xl bg-white/65 border border-border shadow-sm">
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
              <div key={cert.name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/65 border border-border shadow-sm">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground">{cert.name}</span>
                  <p className="text-xs text-muted-foreground">{cert.issuer} &middot; {cert.issued_date}</p>
                </div>
                <span className="text-xs text-[#3f6212] shrink-0 ml-3">{cert.status}</span>
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
              <div key={edu.institution} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/65 border border-border shadow-sm">
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

/* ─── PDF Detail with inline editing ─── */

function PdfDetail({ data, onSave }: { data: PdfData; onSave?: (updated: PdfData) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<PdfData>(data);

  const startEdit = () => {
    setDraft({ ...data });
    setEditing(true);
  };

  const cancel = () => {
    setDraft(data);
    setEditing(false);
  };

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const updateSkill = (idx: number, value: string) => {
    const next = [...draft.skills];
    next[idx] = value;
    setDraft({ ...draft, skills: next });
  };
  const removeSkill = (idx: number) => setDraft({ ...draft, skills: draft.skills.filter((_, i) => i !== idx) });
  const addSkill = () => setDraft({ ...draft, skills: [...draft.skills, ''] });

  const updateExp = (idx: number, field: string, value: string) => {
    const next = [...draft.experience];
    next[idx] = { ...next[idx], [field]: value };
    setDraft({ ...draft, experience: next });
  };
  const removeExp = (idx: number) => setDraft({ ...draft, experience: draft.experience.filter((_, i) => i !== idx) });

  const updateEdu = (idx: number, field: string, value: string) => {
    const next = [...draft.education];
    next[idx] = { ...next[idx], [field]: value };
    setDraft({ ...draft, education: next });
  };
  const removeEdu = (idx: number) => setDraft({ ...draft, education: draft.education.filter((_, i) => i !== idx) });

  const updateCert = (idx: number, value: string) => {
    const next = [...draft.certifications];
    next[idx] = value;
    setDraft({ ...draft, certifications: next });
  };
  const removeCert = (idx: number) => setDraft({ ...draft, certifications: draft.certifications.filter((_, i) => i !== idx) });
  const addCert = () => setDraft({ ...draft, certifications: [...draft.certifications, ''] });

  const d = editing ? draft : data;

  return (
    <div className="space-y-4 pt-4 mt-4 border-t border-border/10">
      {/* Edit / Save toolbar */}
      <div className="flex items-center justify-end gap-2">
        {!editing ? (
          <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/70 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-sm">edit</span>
            Edit
          </button>
        ) : (
          <>
            <button onClick={cancel} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/70 transition-colors cursor-pointer">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm">
              {saving ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">save</span>}
              Save
            </button>
          </>
        )}
      </div>

      {/* Summary */}
      {d.summary && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
          {editing ? (
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={3}
              className="w-full rounded-xl bg-white/70 border border-border px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-primary/40 shadow-sm"
            />
          ) : (
            <p className="text-sm text-foreground leading-relaxed">{d.summary}</p>
          )}
        </div>
      )}

      {/* Skills */}
      {d.skills?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills ({d.skills.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {d.skills.map((s, i) => (
              editing ? (
                <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#7c3aed]/10 border border-[#7c3aed]/20">
                  <input
                    value={s}
                    onChange={(e) => updateSkill(i, e.target.value)}
                    className="bg-transparent text-xs text-[#5b21b6] w-24 focus:outline-none"
                  />
                  <button onClick={() => removeSkill(i)} className="text-[#7c3aed]/50 hover:text-red-600 cursor-pointer">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              ) : (
                <span key={i} className="px-2 py-1 rounded-lg bg-[#7c3aed]/10 text-[#5b21b6] text-xs font-semibold border border-[#7c3aed]/20">
                  {s}
                </span>
              )
            ))}
            {editing && (
              <button onClick={addSkill} className="flex items-center gap-0.5 px-2 py-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-[#7c3aed]/40 hover:text-[#5b21b6] transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-xs">add</span>
                Add
              </button>
            )}
          </div>
        </div>
      )}

      {/* Experience */}
      {d.experience?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Experience</p>
          <div className="space-y-2">
            {d.experience.map((exp, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-white/70 px-3 py-2 shadow-sm">
                {editing ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input value={exp.role} onChange={(e) => updateExp(idx, 'role', e.target.value)} placeholder="Role" className="flex-1 bg-transparent text-sm font-semibold text-foreground focus:outline-none border-b border-border focus:border-primary/40 pb-0.5" />
                      <button onClick={() => removeExp(idx)} className="text-muted-foreground/40 hover:text-red-600 cursor-pointer shrink-0">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input value={exp.company} onChange={(e) => updateExp(idx, 'company', e.target.value)} placeholder="Company" className="flex-1 bg-transparent text-xs text-muted-foreground focus:outline-none border-b border-border focus:border-primary/40 pb-0.5" />
                      <input value={exp.period} onChange={(e) => updateExp(idx, 'period', e.target.value)} placeholder="Period" className="w-28 bg-transparent text-xs text-muted-foreground focus:outline-none border-b border-border focus:border-primary/40 pb-0.5" />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground">{exp.role}</p>
                    <p className="text-xs text-muted-foreground">{exp.company} &middot; {exp.period}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {d.education?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Education</p>
          <div className="space-y-2">
            {d.education.map((edu, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-white/70 px-3 py-2 shadow-sm">
                {editing ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input value={edu.degree} onChange={(e) => updateEdu(idx, 'degree', e.target.value)} placeholder="Degree" className="flex-1 bg-transparent text-sm font-semibold text-foreground focus:outline-none border-b border-border focus:border-primary/40 pb-0.5" />
                      <button onClick={() => removeEdu(idx)} className="text-muted-foreground/40 hover:text-red-600 cursor-pointer shrink-0">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input value={edu.institution} onChange={(e) => updateEdu(idx, 'institution', e.target.value)} placeholder="Institution" className="flex-1 bg-transparent text-xs text-muted-foreground focus:outline-none border-b border-border focus:border-primary/40 pb-0.5" />
                      <input value={edu.year} onChange={(e) => updateEdu(idx, 'year', e.target.value)} placeholder="Year" className="w-20 bg-transparent text-xs text-muted-foreground focus:outline-none border-b border-border focus:border-primary/40 pb-0.5" />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground">{edu.degree}</p>
                    <p className="text-xs text-muted-foreground">{edu.institution} &middot; {edu.year}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {d.certifications?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Certifications</p>
          <div className="flex flex-wrap gap-1.5">
            {d.certifications.map((cert, i) => (
              editing ? (
                <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#65a30d]/10 border border-[#65a30d]/20">
                  <input
                    value={cert}
                    onChange={(e) => updateCert(i, e.target.value)}
                    className="bg-transparent text-xs text-[#3f6212] w-32 focus:outline-none"
                  />
                  <button onClick={() => removeCert(i)} className="text-[#65a30d]/50 hover:text-red-600 cursor-pointer">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              ) : (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-[#65a30d]/10 text-[#3f6212] text-xs font-semibold border border-[#65a30d]/20">
                  {cert}
                </span>
              )
            ))}
            {editing && (
              <button onClick={addCert} className="flex items-center gap-0.5 px-2 py-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-[#65a30d]/40 hover:text-[#3f6212] transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-xs">add</span>
                Add
              </button>
            )}
          </div>
        </div>
      )}

      {/* Strengths */}
      {d.strengths?.length > 0 && !editing && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Strengths</p>
          <div className="space-y-1">
            {d.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="material-symbols-outlined text-xs text-[#65a30d] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
