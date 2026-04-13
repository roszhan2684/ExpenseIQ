import Link from 'next/link';

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Last updated: April 13, 2026</p>
        </div>

        <div className="space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using ExpenseIQ (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service. These Terms apply to all users, including visitors, registered users, and contributors.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">2. Description of Service</h2>
            <p>ExpenseIQ is a personal finance tracking application that allows users to record, categorize, and analyze their expenses. The Service includes AI-powered insights via the Anthropic Claude API, budget management tools, multi-currency support, and data export functionality.</p>
            <p className="mt-3">The Service is provided &ldquo;as is&rdquo; for personal, non-commercial use. We reserve the right to modify or discontinue the Service at any time with reasonable notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">3. Account Registration</h2>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>You must be at least 13 years of age to create an account.</li>
              <li>You must provide accurate, complete, and current information during registration.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account at security@expenseiq.app.</li>
              <li>Each person may maintain only one account. Multiple accounts are not permitted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-sm mt-2">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
              <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or our systems.</li>
              <li>Transmit any malicious code, viruses, or harmful content.</li>
              <li>Use the Service to store or transmit financial data belonging to other persons without their consent.</li>
              <li>Reverse engineer, decompile, or attempt to extract source code.</li>
              <li>Use the Service in a way that could damage, disable, or impair the Service.</li>
              <li>Scrape, crawl, or use automated tools to access the Service beyond normal use.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">5. AI Features &amp; Financial Advice Disclaimer</h2>
            <p className="font-medium text-zinc-900 dark:text-white">IMPORTANT: ExpenseIQ is not a financial advisor. The AI-generated content provided by our Service (summaries, suggestions, roasts, personality types) is for informational and entertainment purposes only.</p>
            <p className="mt-3">AI-generated insights:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li>Do not constitute professional financial, tax, investment, or legal advice.</li>
              <li>May be inaccurate, incomplete, or inappropriate for your specific situation.</li>
              <li>Should not be relied upon as the sole basis for financial decisions.</li>
            </ul>
            <p className="mt-3">Always consult a qualified financial professional for advice specific to your situation. We are not liable for any financial decisions made based on AI-generated content.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">6. Privacy</h2>
            <p>Your use of the Service is also governed by our <Link href="/privacy" className="text-violet-600 dark:text-violet-400 hover:underline">Privacy Policy</Link>, which is incorporated into these Terms by reference. By using the Service, you consent to the data practices described in our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">7. Intellectual Property</h2>
            <p>The Service and its original content, features, and functionality are and will remain the exclusive property of ExpenseIQ and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without prior written consent.</p>
            <p className="mt-3">You retain ownership of all transaction data and content you submit to the Service. By using the Service, you grant us a limited license to process your data solely for the purpose of providing the Service to you.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">8. Service Availability</h2>
            <p>We strive for high availability but cannot guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, upgrades, or circumstances beyond our control. We are not liable for any loss or damage caused by service interruptions.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">9. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, ExpenseIQ and its affiliates, officers, employees, and agents shall not be liable for:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li>Any indirect, incidental, special, consequential, or punitive damages.</li>
              <li>Loss of profits, data, use, goodwill, or other intangible losses.</li>
              <li>Any damages arising from your use or inability to use the Service.</li>
              <li>Any financial decisions made based on AI-generated insights.</li>
              <li>Unauthorized access to or alteration of your data.</li>
            </ul>
            <p className="mt-3">Our total liability shall not exceed the greater of $100 or the amount you paid us in the past 12 months (if any).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">10. Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">11. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li>Violates these Terms.</li>
              <li>Is harmful to other users, third parties, or the Service.</li>
              <li>Is unlawful or fraudulent.</li>
            </ul>
            <p className="mt-3">You may delete your account at any time from the Settings page. Upon termination, your right to use the Service will immediately cease.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">12. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which ExpenseIQ operates, without regard to conflict of law provisions. Any disputes shall be resolved through binding arbitration in that jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">13. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will provide at least 14 days&apos; notice of material changes via email or in-app notification. Your continued use of the Service after changes take effect constitutes your acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">14. Contact</h2>
            <p>For questions about these Terms, contact us at:</p>
            <div className="mt-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
              <p><strong>ExpenseIQ Legal Team</strong></p>
              <p className="text-zinc-500 mt-1">Email: legal@expenseiq.app</p>
            </div>
          </section>
        </div>
      </article>

      <footer className="border-t border-zinc-100 dark:border-zinc-800 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} ExpenseIQ. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white">Privacy Policy</Link>
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-white">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
