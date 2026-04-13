import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">
      <nav className="border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">$</div>
            <span className="font-semibold text-sm">ExpenseIQ</span>
          </Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">← Back to home</Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="text-xs text-violet-600 dark:text-violet-400 font-medium uppercase tracking-wide mb-3">Legal</p>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Last updated: April 13, 2026</p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">1. Introduction</h2>
            <p>ExpenseIQ (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our expense tracking service at expenseiq.app and related services (collectively, the &ldquo;Service&rdquo;).</p>
            <p className="mt-3">Please read this Privacy Policy carefully. If you disagree with its terms, please discontinue use of the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-2">2.1 Information you provide directly</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Account information:</strong> Name and email address when you register.</li>
              <li><strong>Transaction data:</strong> Expense amounts, descriptions, categories, and dates you enter.</li>
              <li><strong>Settings:</strong> Currency preferences, custom categories, and budget limits.</li>
              <li><strong>Password:</strong> Stored as a one-way bcrypt hash — we cannot read your password.</li>
            </ul>
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mt-4 mb-2">2.2 Information collected automatically</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Usage data:</strong> Pages visited, features used, and timestamps (for service improvement only).</li>
              <li><strong>Authentication tokens:</strong> JWT session tokens stored in secure, HttpOnly cookies.</li>
            </ul>
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mt-4 mb-2">2.3 OAuth sign-in</h3>
            <p className="text-sm">If you sign in via Google, GitHub, or Apple, we receive your name, email, and profile picture from those providers. We do not receive your passwords from those services. Their own privacy policies govern their data practices.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>To provide and operate the Service, including storing and displaying your transactions.</li>
              <li>To send your transaction data to Anthropic&apos;s Claude API for AI-powered analysis, when you explicitly request it (e.g., &ldquo;Generate Summary&rdquo; or &ldquo;Roast My Spending&rdquo;).</li>
              <li>To authenticate you and maintain your session securely.</li>
              <li>To respond to your support requests.</li>
              <li>To improve the Service based on aggregated, anonymized usage patterns.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">4. AI Processing &amp; Third Parties</h2>
            <p>When you request AI insights (summaries, roasts, suggestions, personality analysis), your transaction data is sent to <strong>Anthropic&apos;s API</strong> for processing. This includes transaction amounts, descriptions, and categories — but never your name, email, or account information. Anthropic processes this data under their own privacy policy and API terms.</p>
            <p className="mt-3">We do not sell your data to any third party. We do not use your financial data for advertising purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">5. Data Storage &amp; Security</h2>
            <p>Your data is stored in MongoDB Atlas, a cloud database with encryption at rest and in transit. We use industry-standard security practices including:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li>HTTPS/TLS for all data in transit</li>
              <li>bcrypt password hashing (12 rounds)</li>
              <li>HttpOnly, Secure, SameSite session cookies</li>
              <li>Per-user data isolation — you can only access your own data</li>
            </ul>
            <p className="mt-3">No system is 100% secure. In the event of a breach, we will notify affected users within 72 hours.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">6. Data Retention</h2>
            <p>We retain your data for as long as your account is active. You may delete your account at any time from the Settings page, which will permanently delete all associated transactions, settings, and account information within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li><strong>Access:</strong> Request a copy of all data we hold about you.</li>
              <li><strong>Correction:</strong> Update your name or email in account settings.</li>
              <li><strong>Deletion:</strong> Delete your account and all associated data.</li>
              <li><strong>Portability:</strong> Export your transactions as CSV at any time from the Settings page.</li>
              <li><strong>Objection:</strong> Object to processing of your data for specific purposes.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, email us at <strong>privacy@expenseiq.app</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">8. Cookies</h2>
            <p>We use a single session cookie to keep you logged in. We do not use advertising cookies, tracking pixels, or third-party analytics cookies. You can clear cookies in your browser settings, which will sign you out.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">9. Children&apos;s Privacy</h2>
            <p>ExpenseIQ is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected data from a child under 13, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice in the app. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">11. Contact</h2>
            <p>For privacy questions or data requests, contact us at:</p>
            <div className="mt-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
              <p><strong>ExpenseIQ Privacy Team</strong></p>
              <p className="text-zinc-500 mt-1">Email: privacy@expenseiq.app</p>
            </div>
          </section>
        </div>
      </article>

      <footer className="border-t border-zinc-100 dark:border-zinc-800 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} ExpenseIQ. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white">Terms of Service</Link>
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-white">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
