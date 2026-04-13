'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSeekerMatches, getEmployerMatches, accessProfile, agreeMatch } from '@/lib/api';
import { MatchResultDisplay, ProfileReport } from '@/lib/types';

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="3"
          className="text-primary"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
        {score}%
      </span>
    </div>
  );
}

function ProfileModal({
  report,
  onClose,
}: {
  report: ProfileReport;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4 bg-card rounded-2xl border border-border/10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              person_search
            </span>
            <h2 className="font-[var(--font-manrope)] text-lg font-extrabold text-foreground">
              Candidate Profile Report
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-all"
          >
            <span className="material-symbols-outlined text-base text-muted-foreground">close</span>
          </button>
        </div>

        {/* Market Value */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-sm text-primary">trending_up</span>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Market Value Range</p>
          </div>
          <p className="text-lg font-bold text-primary">{report.marketValueRange}</p>
        </div>

        {/* Technical Skills */}
        <div className="mb-5">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-muted-foreground">code</span>
            Technical Skills
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {report.technicalSkills.map((skill) => (
              <div
                key={skill.skill}
                className="flex items-center justify-between rounded-xl bg-accent/50 border border-border/5 px-3 py-2"
              >
                <span className="text-sm font-semibold text-foreground">{skill.skill}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{skill.experience}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    skill.level === 'Expert'
                      ? 'bg-primary/10 text-primary'
                      : skill.level === 'Advanced'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {skill.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="mb-5">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-muted-foreground">folder_open</span>
            Key Projects
          </h3>
          <div className="space-y-2">
            {report.projects.map((project) => (
              <div
                key={project.name}
                className="rounded-xl bg-accent/50 border border-border/5 p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-foreground">{project.name}</p>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {project.role}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{project.impact}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Collaboration */}
        <div className="mb-5">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-muted-foreground">groups</span>
            Collaboration Metrics
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {report.collaboration.map((col) => (
              <div
                key={col.metric}
                className="rounded-xl bg-accent/50 border border-border/5 p-3 text-center"
              >
                <p className="text-lg font-bold text-primary">{col.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{col.metric}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Curve */}
        <div className="mb-5">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-muted-foreground">show_chart</span>
            Growth Curve
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {report.growthCurve.map((period) => (
              <div
                key={period.period}
                className="rounded-xl bg-accent/50 border border-border/5 p-3 min-w-[140px] shrink-0"
              >
                <p className="text-xs font-bold text-foreground mb-1.5">{period.period}</p>
                <div className="flex flex-wrap gap-1">
                  {period.skills.map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        {report.certifications.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              Verified Certifications
            </h3>
            <div className="flex flex-wrap gap-2">
              {report.certifications.map((cert) => (
                <span
                  key={cert}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary"
                >
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                    workspace_premium
                  </span>
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatchingPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchResultDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileReport, setProfileReport] = useState<ProfileReport | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [agreedIds, setAgreedIds] = useState<Set<string>>(new Set());

  const isEmployer = user?.role === 'EMPLOYER';

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchMatches = isEmployer
      ? getEmployerMatches('job-1')
      : getSeekerMatches();

    fetchMatches.then(setMatches).catch(() => setMatches([])).finally(() => setLoading(false));
  }, [user, isEmployer]);

  const handleViewProfile = async (seekerId: string) => {
    setProfileLoading(true);
    try {
      const report = await accessProfile(seekerId);
      setProfileReport(report);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to access profile. Please check your escrow balance.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAgree = async (matchId: string) => {
    try {
      await agreeMatch(matchId);
      setAgreedIds((prev) => new Set(prev).add(matchId));
    } catch {
      // handle error silently for now
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-symbols-outlined text-3xl text-muted-foreground animate-spin">progress_activity</span>
          <p className="text-sm text-muted-foreground mt-2">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Title */}
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          {isEmployer ? 'Candidate Matches' : 'Job Matches'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEmployer
            ? 'AI-ranked candidates for your job posting'
            : 'AI-ranked job opportunities matching your profile'}
        </p>
      </div>

      {/* Results Count */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          {matches.length} {matches.length === 1 ? 'result' : 'results'}
        </span>
      </div>

      {/* Match Cards */}
      <div className="space-y-4">
        {matches.map((match) => {
          const score = Math.round(match.rerankScore * 100);
          const isAgreed = agreedIds.has(match.id);

          return (
            <div
              key={match.id}
              className="bg-card rounded-2xl border border-border/10 p-5 transition-all hover:border-border/20"
            >
              <div className="flex items-start gap-5">
                {/* Score Ring */}
                <ScoreRing score={score} size={64} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      #{match.finalRank}
                    </span>
                    <h3 className="text-base font-bold text-foreground truncate">
                      {match.jobTitle}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {match.companyName}
                    {match.seekerExperienceYears && (
                      <span className="ml-2 text-xs text-muted-foreground/70">
                        {match.seekerExperienceYears} experience
                      </span>
                    )}
                  </p>

                  {/* Skill Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {match.seekerSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md text-xs bg-muted text-muted-foreground font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Score Breakdown */}
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>ANN Score: <span className="font-semibold text-foreground">{(match.annScore * 100).toFixed(0)}%</span></span>
                    <span>Rerank Score: <span className="font-semibold text-foreground">{(match.rerankScore * 100).toFixed(0)}%</span></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  {isAgreed ? (
                    <div className="flex items-center gap-1 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold">
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Agreed
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAgree(match.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all duration-300"
                    >
                      <span className="material-symbols-outlined text-base">handshake</span>
                      Agree
                    </button>
                  )}

                  {isEmployer && (
                    <button
                      onClick={() => handleViewProfile(match.seekerId)}
                      disabled={profileLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-accent transition-all duration-300 disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-base">person_search</span>
                      View Profile
                    </button>
                  )}

                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300">
                    <span className="material-symbols-outlined text-base">close</span>
                    Decline
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {matches.length === 0 && (
          <div className="bg-card rounded-2xl border border-border/10 p-8 text-center">
            <span className="material-symbols-outlined text-3xl text-muted-foreground mb-2">search_off</span>
            <p className="text-sm text-muted-foreground">
              {isEmployer
                ? 'No candidate matches found. Try adjusting your job posting.'
                : 'No job matches found. Make sure your profile is complete.'}
            </p>
          </div>
        )}
      </div>

      {/* Profile Report Modal */}
      {profileReport && (
        <ProfileModal
          report={profileReport}
          onClose={() => setProfileReport(null)}
        />
      )}
    </div>
  );
}
