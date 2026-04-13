import Link from 'next/link';

const features = [
  { icon: '◈', title: 'Smart Dashboard', desc: 'See your monthly totals, daily averages, and projected spend at a glance with beautiful charts.' },
  { icon: '✦', title: 'AI-Powered Insights', desc: 'Get spending summaries, cost-cutting tips, a brutally honest roast, and your personal money personality — all from Claude AI.' },
  { icon: '◉', title: 'Deep Analytics', desc: '12-month trend charts, budget progress, and top-5 biggest transactions help you understand patterns.' },
  { icon: '⚙', title: 'Fully Customizable', desc: 'Set per-category budgets with overspend alerts, create custom categories, and pick from 10 currencies.' },
  { icon: '↓', title: 'CSV Export', desc: 'Download all your transactions as a CSV file for taxes, spreadsheets, or your accountant.' },
  { icon: '☽', title: 'Dark & Light Mode', desc: 'A clean, modern interface that works beautifully in both light and dark mode.' },
];

const steps = [
  { step: '01', title: 'Create an account', desc: 'Sign up free with Google, GitHub, Apple, or email in seconds.' },
  { step: '02', title: 'Add transactions', desc: 'Log expenses manually or upload bank statements. AI auto-categorizes everything.' },
  { step: '03', title: 'Get insights', desc: 'Ask Claude to summarize your spending, roast your habits, or suggest where to cut back.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">$</div>
            <span className="font-semibold text-base tracking-tight">ExpenseIQ</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors px-3 py-2">Sign in</Link>
            <Link href="/register" className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-medium mb-8">
          <span>✦</span> Powered by Claude AI
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
          Track every dollar.<br />
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">AI that actually helps.</span>
        </h1>
        <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          ExpenseIQ combines smart expense tracking with Claude AI to give you real insights — not just numbers. Know where your money goes, and get brutally honest advice on what to do about it.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors text-base shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
            Start for free
          </Link>
          <Link href="/login" className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-base">
            Sign in
          </Link>
        </div>
        <p className="text-xs text-zinc-400 mt-5">Free forever · No credit card required · Your data stays private</p>
      </section>

      {/* Features */}
      <section id="features" className="bg-zinc-50 dark:bg-zinc-900 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to master your finances</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">Built for real people who want to understand their money without becoming an accountant.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white dark:bg-zinc-800 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-700 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Get started in minutes</h2>
          <p className="text-zinc-500 dark:text-zinc-400">No complicated setup. No tutorials. Just sign up and go.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-violet-200 dark:shadow-violet-900/30">{s.step}</div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Showcase */}
      <section className="bg-gradient-to-br from-violet-600 to-indigo-700 py-24">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <div className="text-4xl mb-4">✦</div>
          <h2 className="text-3xl font-bold mb-4">Meet your AI financial advisor</h2>
          <p className="text-violet-100 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            ExpenseIQ uses Claude — Anthropic&apos;s most capable AI — to analyze your spending patterns and give you insights you&apos;d normally pay hundreds of dollars for. Ask it to roast your habits, find where you&apos;re overspending, or figure out your money personality.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
            {[
              { label: 'Monthly Summary', text: '"You spent 40% of your budget on food. That\'s either impressive cooking or a serious restaurant addiction."' },
              { label: 'Spending Personality', text: '"The Subscription Hoarder — you\'re paying for 4 streaming services but only watch 1."' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                <p className="text-xs text-violet-200 font-medium mb-2">{item.label}</p>
                <p className="text-sm text-white/90 leading-relaxed italic">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold mb-6">About ExpenseIQ</h2>
        <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          ExpenseIQ was built to make personal finance less painful and more actionable. Most expense trackers show you charts and leave you wondering what to do. We pair your data with Claude AI so you get plain-language explanations, honest critiques, and real suggestions — not just graphs.
        </p>
        <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          Your data is stored securely in MongoDB, protected by industry-standard authentication. We never sell your data, never show ads, and never share your financial information with third parties. Your transactions are private and always will be.
        </p>
        <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
          ExpenseIQ is free to use. We believe everyone deserves financial clarity regardless of their budget.
        </p>
      </section>

      {/* CTA */}
      <section className="bg-zinc-50 dark:bg-zinc-900 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to take control?</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">Join users who track smarter with AI-powered insights.</p>
          <Link href="/register" className="inline-block px-10 py-4 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors text-base shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
            Create your free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">$</div>
              <span className="font-semibold text-sm">ExpenseIQ</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Terms of Service</Link>
              <Link href="#about" className="hover:text-zinc-900 dark:hover:text-white transition-colors">About</Link>
            </div>
            <p className="text-sm text-zinc-400">© {new Date().getFullYear()} ExpenseIQ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
