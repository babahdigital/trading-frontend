import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import ContactForm from '@/components/forms/contact-form';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-24">
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Talk to us.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Whether you have a question about our products, need technical support,
              or want to discuss an institutional mandate -- we are here to help.
            </p>
          </div>
        </section>

        {/* Two Columns */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="grid md:grid-cols-2 gap-16">
              {/* Left: Contact Form */}
              <div>
                <h2 className="font-display text-xl font-semibold mb-8">Send a message</h2>
                <ContactForm />
              </div>

              {/* Right: Direct Channels */}
              <div>
                <h2 className="font-display text-xl font-semibold mb-8">Direct channels</h2>
                <div className="space-y-8">
                  <div>
                    <p className="text-sm font-medium mb-1">General inquiries</p>
                    <a
                      href="mailto:hello@babahalgo.com"
                      className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      hello@babahalgo.com
                    </a>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Compliance</p>
                    <a
                      href="mailto:compliance@babahalgo.com"
                      className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      compliance@babahalgo.com
                    </a>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">WhatsApp</p>
                    <p className="font-mono text-sm text-muted-foreground">
                      +62 (business hours, WIB)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available Monday - Friday, 09:00 - 17:00 WIB
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Schedule a call</p>
                    <a
                      href="https://cal.com/babahalgo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Book on Cal.com
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      15 or 30 minute slots available
                    </p>
                  </div>

                  <div className="border-t border-border pt-8">
                    <p className="text-sm font-medium mb-3">Office</p>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      <p className="font-semibold text-foreground">CV Babah Digital</p>
                      <p>Indonesia</p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-8">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      We aim to respond to all inquiries within 1-2 business days.
                      For urgent matters related to active accounts, please use WhatsApp
                      or email with &quot;URGENT&quot; in the subject line.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
