'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useUnifiedWallet } from '@/lib/wallet-adapter';
import { useRouter } from 'next/navigation';

const proofCards = [
  {
    icon: 'verified_user',
    title: 'Verified Career Evidence',
    description: 'Connect GitHub, resumes, work signals, and credentials so your profile is grounded in proof.',
    accent: '#0891b2',
  },
  {
    icon: 'smart_toy',
    title: 'Autonomous AI Agent',
    description: 'Your agent turns evidence into a market-ready profile and negotiates with context.',
    accent: '#be185d',
  },
  {
    icon: 'account_balance',
    title: 'On-Chain Agreements',
    description: 'Finalize compensation and terms with verifiable escrow and agreement records.',
    accent: '#65a30d',
  },
];

const steps = [
  { label: 'Collect', value: 'Evidence', icon: 'hub', accent: '#0891b2' },
  { label: 'Analyze', value: 'Market Value', icon: 'query_stats', accent: '#be185d' },
  { label: 'Negotiate', value: 'Better Terms', icon: 'handshake', accent: '#65a30d' },
];

export default function LandingPage() {
  const { user, logout } = useAuth();
  const { signOut } = useUnifiedWallet();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    logout();
    router.push('/');
  };

  const dashboardPath = user?.role === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/seeker';

  return (
    <div className="min-h-screen overflow-hidden app-ambient selection:bg-primary selection:text-primary-foreground">
      <header className="fixed top-0 z-50 w-full border-b border-border/70 bg-white/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/55">
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 shadow-[0_14px_30px_rgba(8,145,178,0.18)]">
              <img src="/icon.svg" alt="TalentTee" className="h-7 w-7" />
            </span>
            <span className="font-[var(--font-playfair)] text-2xl font-black tracking-tight text-primary">
              TalentTee<span className="text-[#be185d]">.</span>
            </span>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href={dashboardPath}
                className="rounded-xl bg-primary px-5 py-2.5 text-base font-bold tracking-wide text-primary-foreground shadow-[0_14px_30px_rgba(8,145,178,0.22)] transition-colors hover:bg-primary/90"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-base text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-base font-semibold text-muted-foreground transition-colors hover:text-foreground">
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-primary px-5 py-2.5 text-base font-bold tracking-wide text-primary-foreground shadow-[0_14px_30px_rgba(8,145,178,0.22)] transition-colors hover:bg-primary/90"
              >
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </header>

      <main>
        <section className="px-6 pb-24 pt-36 md:pt-44">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="text-center lg:text-left">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_5px_rgba(8,145,178,0.12)]" />
                <span className="text-sm font-black uppercase tracking-[0.18em] text-primary">AI career command center</span>
              </div>
              <h1 className="text-balance font-[var(--font-manrope)] text-5xl font-black leading-[0.95] tracking-[-0.065em] text-foreground sm:text-6xl lg:text-7xl">
                Turn career evidence into negotiating leverage.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground lg:mx-0">
                TalentTee connects your proof of work, generates market-aware career analysis, and lets an AI agent negotiate offers with verified context.
              </p>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
                <Link
                  href={user ? dashboardPath : '/signup'}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-base font-black text-primary-foreground shadow-[0_20px_45px_rgba(8,145,178,0.25)] transition-transform hover:-translate-y-0.5"
                >
                  Start Building Leverage
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-white/70 px-7 py-3.5 text-base font-black text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-white">
                  <span className="material-symbols-outlined text-lg">play_circle</span>
                  Watch Demo
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
              <div className="absolute -right-6 bottom-8 h-40 w-40 rounded-full bg-[#be185d]/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-border bg-white/65 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
                <div className="rounded-[1.5rem] border border-border bg-white/80 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Profile signal</p>
                      <h2 className="mt-1 font-[var(--font-manrope)] text-2xl font-black tracking-tight text-foreground">Dev Kim</h2>
                    </div>
                    <span className="rounded-full border border-[#65a30d]/20 bg-[#65a30d]/10 px-3 py-1 text-sm font-bold text-[#3f6212]">87% evidence</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {steps.map((step) => (
                      <div key={step.label} className="rounded-2xl border border-border bg-white/70 p-4 shadow-sm">
                        <span className="material-symbols-outlined text-xl" style={{ color: step.accent, fontVariationSettings: "'FILL' 1" }}>
                          {step.icon}
                        </span>
                        <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">{step.label}</p>
                        <p className="mt-1 text-lg font-black text-foreground">{step.value}</p>
                      </div>
                    ))}
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 shadow-sm sm:col-span-2">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Agent recommendation</p>
                          <p className="mt-1 text-lg font-black text-foreground">Ask for $96k and remote-first terms</p>
                        </div>
                        <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-12 max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">Why TalentTee</p>
              <h2 className="mt-3 text-balance font-[var(--font-manrope)] text-4xl font-black tracking-[-0.055em] text-foreground">
                A brighter way to prove, price, and negotiate your work.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {proofCards.map((card) => (
                <div key={card.title} className="group rounded-[1.75rem] border border-border bg-white/70 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-transform hover:-translate-y-1">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-border" style={{ color: card.accent }}>
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>
                  </div>
                  <h3 className="font-[var(--font-manrope)] text-xl font-black tracking-tight text-foreground">{card.title}</h3>
                  <p className="mt-3 text-pretty text-base leading-7 text-muted-foreground">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-[1000px] rounded-[2rem] border border-border bg-white/70 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl md:p-12">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">Ready when you are</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance font-[var(--font-manrope)] text-4xl font-black tracking-[-0.055em] text-foreground">
              Let your AI agent turn proof into better offers.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
              Start with your data sources, generate your profile, and move into negotiation with context that employers can trust.
            </p>
            <Link
              href={user ? dashboardPath : '/signup'}
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-base font-black text-primary-foreground shadow-[0_20px_45px_rgba(8,145,178,0.25)] transition-transform hover:-translate-y-0.5"
            >
              Get Started Now
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-6 py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row">
          <div className="font-[var(--font-playfair)] text-lg font-black text-foreground">TalentTee<span className="text-[#be185d]">.</span></div>
          <div className="flex flex-wrap justify-center gap-6 font-semibold">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security Architecture</span>
          </div>
          <div className="font-medium">&copy; 2026 TalentTee. Securely anchored on the Blockchain.</div>
        </div>
      </footer>
    </div>
  );
}
