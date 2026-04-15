import Link from 'next/link';

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    title: 'Bank-Level Connectivity',
    desc: 'Securely connect 12,000+ financial institutions via Plaid. Transactions sync automatically — no manual entry required.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: 'AI-Powered Analysis',
    desc: 'Gemini AI decodes your spending patterns, flags unusual charges, and generates actionable recommendations in plain English.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    title: 'Running Balance Tracker',
    desc: 'View cumulative earnings vs. spending month over month — exactly like a bank statement, but with visual clarity.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Bank-Grade Security',
    desc: 'AES-256-GCM encrypted tokens, OAuth 2.0 authentication, and zero storage of plain-text credentials. Your data never leaves secured infrastructure.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: 'Smart Statement Import',
    desc: 'Upload PDF or CSV bank statements. Our rule-based parser extracts and categorizes every transaction instantly — no AI quota, no delays.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Budget Alerts & Forecasting',
    desc: 'Set per-category budgets with overspend alerts. See projected month-end totals based on current spending velocity.',
  },
];

const stats = [
  { value: '12,000+', label: 'Financial institutions supported' },
  { value: 'AES-256', label: 'Encryption standard' },
  { value: '< 2s', label: 'Average sync time' },
  { value: '100%', label: 'Free, no credit card' },
];

const steps = [
  {
    step: '01',
    title: 'Create your account',
    desc: 'Sign up in under 30 seconds using Google, GitHub, or email — no credit card, no trial periods.',
  },
  {
    step: '02',
    title: 'Connect your bank',
    desc: 'Link accounts via Plaid\'s secure OAuth flow. Supports checking, savings, credit cards, and investment accounts.',
  },
  {
    step: '03',
    title: 'Get real insights',
    desc: 'Your dashboard populates instantly. Ask the AI for summaries, savings tips, or a brutally honest spending critique.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">$</div>
            <span className="font-bold text-base tracking-tight">ExpenseIQ</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#security" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Security</a>
            <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-white transition-colors">How it works</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/register" className="text-sm font-semibold px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50/60 to-white dark:from-violet-950/20 dark:to-zinc-950 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-400/10 dark:bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 text-xs font-semibold mb-8 shadow-sm">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Powered by Gemini AI · Secured by Plaid
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Intelligent finance tracking<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 bg-clip-text text-transparent"> for modern life.</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect your bank accounts, auto-sync transactions, and let AI turn raw spending data into decisions you can act on — all in one secure platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 active:bg-violet-800 transition-colors text-base shadow-lg shadow-violet-200 dark:shadow-violet-900/40"
            >
              Start for free — no card needed
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-base"
            >
              Sign in to dashboard
            </Link>
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-5 flex items-center justify-center gap-3">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Free forever
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              No credit card required
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Your data stays private
            </span>
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-zinc-200 dark:divide-zinc-700">
            {stats.map((s) => (
              <div key={s.label} className="text-center px-4">
                <p className="text-2xl sm:text-3xl font-extrabold text-violet-600 dark:text-violet-400 tracking-tight">{s.value}</p>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">Platform capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything you need to master your finances
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-base leading-relaxed">
              Built on enterprise-grade infrastructure — from Plaid bank connectivity to AES-256 encryption — with the usability of a consumer app.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-lg hover:shadow-violet-50 dark:hover:shadow-violet-950/50 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/50 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base text-zinc-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security section */}
      <section id="security" className="bg-zinc-950 dark:bg-zinc-900 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-4">Security & compliance</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-6">
                Your financial data deserves enterprise-grade protection.
              </h2>
              <p className="text-zinc-400 text-base leading-relaxed mb-8">
                We never store your bank credentials. Plaid handles authentication using the same OAuth 2.0 flows that power major financial institutions. Your access tokens are encrypted at rest using AES-256-GCM before hitting our database.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'AES-256-GCM encryption', desc: 'All access tokens encrypted before database storage.' },
                  { title: 'Zero credential storage', desc: 'We never see or store your banking username or password.' },
                  { title: 'OAuth 2.0 via Plaid', desc: 'Industry-standard bank authentication used by 8,000+ apps.' },
                  { title: 'JWT session security', desc: 'Short-lived tokens with cryptographic signature verification.' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-zinc-500 ml-2 font-mono">security-overview</span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  {[
                    { label: 'Authentication', value: 'OAuth 2.0 + JWT', color: 'text-emerald-400' },
                    { label: 'Token encryption', value: 'AES-256-GCM', color: 'text-emerald-400' },
                    { label: 'Data in transit', value: 'TLS 1.3', color: 'text-emerald-400' },
                    { label: 'Database', value: 'MongoDB Atlas (encrypted)', color: 'text-emerald-400' },
                    { label: 'Bank credentials', value: 'Never stored', color: 'text-violet-400' },
                    { label: 'Data selling', value: 'Never', color: 'text-violet-400' },
                    { label: 'Third-party sharing', value: 'Never', color: 'text-violet-400' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
                      <span className="text-zinc-400">{row.label}</span>
                      <span className={`${row.color} font-semibold`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-violet-600/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">Get started in minutes</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">From zero to financial clarity.</h2>
            <p className="text-zinc-500 dark:text-zinc-400">No spreadsheets. No manual data entry. No complicated setup.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px bg-gradient-to-r from-violet-200 to-violet-200 dark:from-violet-800 dark:to-violet-800" />
            {steps.map((s, i) => (
              <div key={s.step} className="relative bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-100 dark:border-zinc-800 text-center">
                <div className={`w-14 h-14 rounded-2xl font-bold text-xl flex items-center justify-center mx-auto mb-6 shadow-lg ${
                  i === 0 ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-violet-200 dark:shadow-violet-900/40' :
                  i === 1 ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-200 dark:shadow-indigo-900/40' :
                  'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-blue-200 dark:shadow-blue-900/40'
                }`}>
                  {s.step}
                </div>
                <h3 className="font-bold text-lg mb-3 text-zinc-900 dark:text-white">{s.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Showcase */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-violet-800 py-20 sm:py-28">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(to_bottom,transparent,black,transparent)]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold mb-8">
            <svg className="w-3.5 h-3.5 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Financial Intelligence
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Your data. Plain-language insights.
          </h2>
          <p className="text-violet-100 text-base sm:text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            ExpenseIQ uses Gemini AI to transform raw transaction data into the kind of analysis you&apos;d normally pay a financial advisor for — delivered in seconds.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
            {[
              {
                type: 'Monthly Summary',
                badge: 'AI Analysis',
                text: '"You spent 38% of your income on food this month — $847 total. Your biggest outliers: three restaurant visits totaling $312. Consider cooking twice a week to save ~$200 monthly."',
              },
              {
                type: 'Cost-Cutting Tips',
                badge: 'Actionable',
                text: '"You have 4 active subscriptions ($67/mo) you haven\'t used in 30+ days. Cancelling them would free up $804 per year — enough for a vacation."',
              },
              {
                type: 'Spending Personality',
                badge: 'Insight',
                text: '"The Convenience Spender — you consistently pay premium for speed: same-day delivery, ride-sharing, and instant checkout. You value time over money."',
              },
              {
                type: 'Honest Roast',
                badge: 'Brutal Truth',
                text: '"Your coffee budget is $189 this month. That\'s a car payment. You\'re not buying coffee — you\'re renting focus at a 900% markup."',
              },
            ].map((item) => (
              <div key={item.type} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/15 hover:bg-white/15 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-violet-200">{item.type}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/80">{item.badge}</span>
                </div>
                <p className="text-sm text-white/85 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Take control of your finances today.
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-base sm:text-lg mb-10 leading-relaxed">
            Join thousands of users who replaced guesswork with data-driven financial decisions — completely free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-10 py-4 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors text-base shadow-xl shadow-violet-200 dark:shadow-violet-900/40"
            >
              Create your free account
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-10 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-base"
            >
              I already have an account
            </Link>
          </div>
          <p className="text-xs text-zinc-400 mt-6">
            No credit card · No hidden fees · Cancel (or delete your account) anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold">$</div>
              <span className="font-bold text-sm">ExpenseIQ</span>
              <span className="text-xs text-zinc-400 ml-1">Intelligent Finance Tracking</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Terms of Service</Link>
              <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Features</a>
              <a href="#security" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Security</a>
            </div>
            <p className="text-sm text-zinc-400">© {new Date().getFullYear()} ExpenseIQ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
