export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 prose prose-slate dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="lead text-muted-foreground">Last updated: July 2026</p>

      <h2>1. Who We Are</h2>
      <p>
        PYQBase ("we", "us", "our") is an educational platform helping students prepare for competitive
        examinations. Our registered email for privacy matters is{" "}
        <a href="mailto:privacy@pyqbase.com">privacy@pyqbase.com</a>.
      </p>

      <h2>2. What We Collect</h2>
      <ul>
        <li><strong>Account data:</strong> Email address, hashed password (managed by Supabase Auth).</li>
        <li><strong>Usage data:</strong> Questions attempted, answers selected, time taken, SRS review history.</li>
        <li><strong>Device data:</strong> Browser fingerprint (anonymous canvas hash) used solely for free-tier quota enforcement. Not linked to identity.</li>
        <li><strong>Payment data:</strong> Handled entirely by our payment processor. We do not store card details.</li>
      </ul>

      <h2>3. Why We Use It</h2>
      <ul>
        <li>To personalise your study experience (SRS, ELO-based difficulty).</li>
        <li>To enforce fair-use quotas under the freemium model.</li>
        <li>To send you daily SRS reminder emails (you may unsubscribe at any time).</li>
        <li>To diagnose errors via Sentry (anonymised stack traces).</li>
      </ul>

      <h2>4. Retention</h2>
      <p>
        We retain your data for the duration of your account. If you delete your account, your data is
        soft-deleted and permanently erased after 30 days. You may request immediate erasure by emailing us.
      </p>

      <h2>5. Your Rights (DPDP Act 2023)</h2>
      <p>Under India's Digital Personal Data Protection Act 2023, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> your data — use the "Export My Data" button in Settings.</li>
        <li><strong>Correct</strong> inaccurate data — contact us at <a href="mailto:privacy@pyqbase.com">privacy@pyqbase.com</a>.</li>
        <li><strong>Erase</strong> your data — use "Delete Account" in Settings (30-day reactivation window applies).</li>
        <li><strong>Withdraw consent</strong> — you may delete your account at any time.</li>
      </ul>

      <h2>6. Data Export</h2>
      <p>
        You can request a full JSON export of your attempts, SRS state, and mock tests from the Settings page.
        The export will be emailed to your registered address within 72 hours.
      </p>

      <h2>7. Cookies &amp; Tracking</h2>
      <p>
        We use only strictly necessary cookies (Supabase Auth session). We do not use advertising cookies
        or third-party tracking pixels.
      </p>

      <h2>8. Third-Party Services</h2>
      <ul>
        <li><strong>Supabase</strong> — authentication and database (EU/US data residency).</li>
        <li><strong>Resend</strong> — transactional email delivery.</li>
        <li><strong>Sentry</strong> — error monitoring (anonymised).</li>
        <li><strong>Vercel</strong> — frontend hosting.</li>
        <li><strong>Railway</strong> — backend hosting.</li>
      </ul>

      <h2>9. Changes</h2>
      <p>
        We will notify you of material changes to this policy via email at least 14 days before they take effect.
      </p>

      <h2>10. Contact</h2>
      <p>
        For any privacy queries, write to{" "}
        <a href="mailto:privacy@pyqbase.com">privacy@pyqbase.com</a>.
      </p>
    </div>
  )
}
