import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

export const dynamic = 'force-dynamic';

export default async function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main className="max-w-[720px] mx-auto px-6 py-20" style={{ lineHeight: 1.7 }}>
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">
          Cookie Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: April 1, 2026</p>

        <div className="space-y-10 text-muted-foreground">
          <section>
            <p>
              This Cookie Policy explains how CV Babah Digital (&quot;BabahAlgo,&quot; &quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;) uses cookies and similar technologies on our website
              and platform. This policy should be read alongside our{' '}
              <Link href="/legal/privacy" className="text-foreground underline underline-offset-4">
                Privacy Policy
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">1. What Are Cookies</h2>
            <p>
              Cookies are small text files that are stored on your device (computer, tablet, or mobile
              phone) when you visit a website. They are widely used to make websites work more
              efficiently, provide information to website operators, and improve the user experience.
              Cookies can be &quot;persistent&quot; (remaining on your device until they expire or are
              deleted) or &quot;session&quot; (deleted when you close your browser).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">2. Cookies We Use</h2>

            <h3 className="font-semibold text-foreground mt-6 mb-3">Essential cookies</h3>
            <p>
              These cookies are strictly necessary for the operation of our platform. They include
              cookies that enable you to log in to your account, maintain your session, and access
              secure areas. Without these cookies, the services you have asked for cannot be provided.
              These cookies do not require your consent.
            </p>
            <div className="mt-3 border border-border rounded-lg overflow-hidden text-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="text-left p-3 font-medium text-muted-foreground">Cookie</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Purpose</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-3 font-mono text-xs">session_token</td>
                    <td className="p-3">Authentication and session management</td>
                    <td className="p-3">Session</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 font-mono text-xs">csrf_token</td>
                    <td className="p-3">Cross-site request forgery protection</td>
                    <td className="p-3">Session</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 font-mono text-xs">locale</td>
                    <td className="p-3">Language preference</td>
                    <td className="p-3">1 year</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-xs">cookie_consent</td>
                    <td className="p-3">Stores your cookie consent preferences</td>
                    <td className="p-3">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-semibold text-foreground mt-6 mb-3">Analytics cookies</h3>
            <p>
              These cookies help us understand how visitors interact with our platform by collecting
              and reporting information anonymously. They allow us to measure traffic, identify
              popular pages, and improve the user experience. These cookies are only set with your
              consent.
            </p>
            <div className="mt-3 border border-border rounded-lg overflow-hidden text-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="text-left p-3 font-medium text-muted-foreground">Cookie</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Purpose</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-3 font-mono text-xs">_analytics_id</td>
                    <td className="p-3">Anonymous visitor identification for analytics</td>
                    <td className="p-3">2 years</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-xs">_analytics_session</td>
                    <td className="p-3">Session tracking for page view analytics</td>
                    <td className="p-3">30 minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-semibold text-foreground mt-6 mb-3">Functional cookies</h3>
            <p>
              These cookies enable enhanced functionality and personalization, such as remembering
              your dashboard layout preferences and display settings. They may be set by us or by
              third-party providers whose services we use on our platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">3. Third-Party Cookies</h2>
            <p>
              Some cookies on our platform are set by third-party services that we use:
            </p>
            <ul className="mt-3 space-y-2 ml-4">
              <li className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>
                  <strong className="text-foreground">Cloudflare:</strong> Security and performance
                  cookies used for DDoS protection, bot detection, and content delivery optimization.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>
                  <strong className="text-foreground">Payment processors:</strong> Cookies used during
                  the payment flow for fraud detection and session management.
                </span>
              </li>
            </ul>
            <p className="mt-3">
              We do not use advertising cookies or social media tracking cookies. We do not participate
              in cross-site advertising networks.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">4. Managing Cookies</h2>
            <p>
              You can control and manage cookies through your browser settings. Most browsers allow you
              to view, delete, and block cookies from websites. Please note that if you disable essential
              cookies, some features of our platform may not function correctly.
            </p>
            <p className="mt-3">
              Instructions for managing cookies in common browsers:
            </p>
            <ul className="mt-3 space-y-2 ml-4">
              <li className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Chrome: Settings &gt; Privacy and Security &gt; Cookies and other site data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Firefox: Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Safari: Preferences &gt; Privacy &gt; Manage Website Data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Edge: Settings &gt; Cookies and site permissions &gt; Cookies and site data</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">5. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Changes will be posted on this page
              with an updated revision date. If we make significant changes to how we use cookies, we
              will notify you through a notice on our platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">6. Contact</h2>
            <p>
              If you have questions about our use of cookies, contact us at{' '}
              <a href="mailto:privacy@babahalgo.com" className="text-foreground underline underline-offset-4">
                privacy@babahalgo.com
              </a>.
            </p>
          </section>
        </div>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
