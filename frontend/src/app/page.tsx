import Link from 'next/link';

const features = [
  {
    icon: 'smart_toy',
    title: 'AI-Powered Matching',
    description:
      'ANN + rerank algorithms find the perfect match between talent and opportunity with precision.',
  },
  {
    icon: 'forum',
    title: 'Autonomous Negotiation',
    description:
      'Your personal AI agent negotiates salary, benefits, and contract terms on your behalf.',
  },
  {
    icon: 'account_balance',
    title: 'Blockchain Escrow',
    description:
      'NEAR Protocol-based escrow ensures safe, transparent, and verifiable transactions.',
  },
];

const steps = [
  {
    num: '01',
    icon: 'cloud_upload',
    title: 'Connect Your Data',
    description: 'Upload your experience and preferences. AI generates an optimized resume automatically.',
  },
  {
    num: '02',
    icon: 'psychology',
    title: 'AI Finds Matches',
    description: 'Our AI agents find the best matches and begin autonomous negotiation on your behalf.',
  },
  {
    num: '03',
    icon: 'handshake',
    title: 'Review & Accept',
    description: 'Review encrypted negotiation results and finalize agreements on the blockchain.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e0e] selection:bg-primary selection:text-primary-foreground">
      {/* Nav Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#0e0e0e]/80 backdrop-blur-xl border-b border-border/5">
        <nav className="flex justify-between items-center px-6 md:px-8 py-5 max-w-[1200px] mx-auto">
          <div className="text-2xl font-extrabold tracking-tighter text-primary uppercase font-[var(--font-manrope)]">
            Talent-Tee
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold tracking-wide hover:bg-primary/90 transition-all duration-300 ease-out-expo"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="pt-40 pb-24 px-6">
          <div className="max-w-[1200px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary font-semibold tracking-wide uppercase">
                Powered by NEAR Protocol
              </span>
            </div>
            <h1 className="font-[var(--font-manrope)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
              AI Agents That<br />
              Negotiate Your{' '}
              <span className="text-primary">Career</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg md:text-xl leading-relaxed mb-10">
              Your personal AI agent handles salary negotiations, job matching,
              and contract terms — all encrypted on NEAR blockchain.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base tracking-wide hover:bg-primary/90 transition-all duration-300 ease-out-expo shadow-[0_0_40px_rgba(255,168,79,0.2)] hover:shadow-[0_0_60px_rgba(255,168,79,0.3)] flex items-center gap-2"
              >
                Get Started
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
              <button className="px-8 py-4 rounded-xl bg-muted text-foreground font-bold text-base tracking-wide hover:bg-accent transition-all duration-300 ease-out-expo flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">play_circle</span>
                Watch Demo
              </button>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="py-24 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
                Why Talent-Tee?
              </h2>
              <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                AI agents work around the clock so you don&apos;t have to.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((f) => (
                <div
                  key={f.icon}
                  className="group relative bg-card rounded-2xl p-8 border border-border/10 hover:border-primary/20 transition-all duration-500 ease-out-expo"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-500">
                    <span className="material-symbols-outlined text-primary text-2xl">
                      {f.icon}
                    </span>
                  </div>
                  <h3 className="font-[var(--font-manrope)] text-xl font-bold text-foreground mb-3">
                    {f.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24 px-6 bg-[#131313]">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
                How it Works
              </h2>
              <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                Three simple steps to let AI handle your career negotiations.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((s, i) => (
                <div key={s.num} className="relative flex flex-col items-center text-center">
                  {/* Connector line (hidden on mobile) */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-border/20" />
                  )}
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 relative">
                    <span className="material-symbols-outlined text-primary text-3xl">
                      {s.icon}
                    </span>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {s.num}
                    </span>
                  </div>
                  <h3 className="font-[var(--font-manrope)] text-lg font-bold text-foreground mb-2">
                    {s.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-[800px] mx-auto text-center">
            <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Ready to let AI negotiate for you?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join Talent-Tee and let your AI agent find the best career opportunities.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base tracking-wide hover:bg-primary/90 transition-all duration-300 ease-out-expo shadow-[0_0_40px_rgba(255,168,79,0.2)]"
            >
              Get Started Now
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 bg-[#131313]">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 border-t border-border/10 pt-12 max-w-[1200px] mx-auto gap-8">
          <div className="text-lg font-bold text-secondary-foreground">Talent-Tee</div>
          <div className="flex flex-wrap justify-center gap-8">
            <span className="text-muted-foreground hover:text-secondary-foreground transition-colors text-sm font-medium tracking-wide cursor-pointer">
              Privacy Policy
            </span>
            <span className="text-muted-foreground hover:text-secondary-foreground transition-colors text-sm font-medium tracking-wide cursor-pointer">
              Terms of Service
            </span>
            <span className="text-muted-foreground hover:text-secondary-foreground transition-colors text-sm font-medium tracking-wide cursor-pointer">
              Security Architecture
            </span>
          </div>
          <div className="text-muted-foreground text-xs font-medium tracking-wide opacity-60">
            &copy; 2024 Talent-Tee. Securely anchored on the Blockchain.
          </div>
        </div>
      </footer>
    </div>
  );
}
