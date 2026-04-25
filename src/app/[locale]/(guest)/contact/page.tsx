import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import ContactForm from '@/components/forms/contact-form';
import { CalEmbed } from '@/components/ui/cal-embed';
import { Mail, MessageCircle, Send, Clock, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Contact</p>
            <h1 className="t-display-page mb-6">Talk to us.</h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Whether you have a question about our products, need technical support,
              or want to discuss an institutional mandate &mdash; we are here to help.
            </p>
          </div>
        </section>

        {/* Schedule a Call */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Book a Call</p>
            <h2 className="t-display-sub mb-2">Schedule a briefing</h2>
            <p className="t-body-sm text-foreground/50 mb-8">
              Book a 15 or 30-minute call with our quant team. We use Google Meet for all sessions.
            </p>
            <div className="card-enterprise p-0 overflow-hidden">
              <CalEmbed calLink="babahalgo/briefing" />
            </div>
          </div>
        </section>

        {/* Two Columns: Form + Direct Channels */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-16 lg:gap-20">
              {/* Left: Contact Form (60%) */}
              <div className="lg:col-span-3">
                <p className="t-eyebrow mb-3">Message</p>
                <h2 className="t-display-sub mb-8">Send us a message</h2>
                <ContactForm />
              </div>

              {/* Right: Direct Channels (40%) */}
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">Direct Channels</p>
                <h2 className="t-display-sub mb-8">Reach us directly</h2>
                <div className="space-y-6">
                  <ChannelCard
                    icon={<Mail className="w-5 h-5" />}
                    title="General inquiries"
                    href="mailto:hello@babahalgo.com"
                    value="hello@babahalgo.com"
                  />
                  <ChannelCard
                    icon={<Mail className="w-5 h-5" />}
                    title="Institutional inquiries"
                    href="mailto:ir@babahalgo.com"
                    value="ir@babahalgo.com"
                  />
                  <ChannelCard
                    icon={<MessageCircle className="w-5 h-5" />}
                    title="WhatsApp"
                    href="https://wa.me/6281234567890"
                    value="+62 (business hours)"
                  />
                  <ChannelCard
                    icon={<Send className="w-5 h-5" />}
                    title="Telegram"
                    href="https://t.me/babahalgo"
                    value="@babahalgo"
                  />

                  <div className="border-t border-border/60 pt-6">
                    <div className="flex items-start gap-3 mb-6">
                      <MapPin className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium mb-1">Office</p>
                        <p className="text-sm text-foreground/60">CV Babah Digital</p>
                        <p className="text-sm text-foreground/60">Indonesia</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium mb-1">Response time</p>
                        <p className="text-xs text-foreground/50 leading-relaxed">
                          We respond within 1–2 business days. For urgent account matters,
                          use WhatsApp or email with &quot;URGENT&quot; in the subject.
                        </p>
                      </div>
                    </div>
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

function ChannelCard({ icon, title, href, value }: { icon: React.ReactNode; title: string; href: string; value: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="flex items-center gap-4 p-4 rounded-lg border border-border/60 bg-muted/30 hover:border-amber-500/30 hover:bg-muted/50 transition-all group"
    >
      <div className="icon-container shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium group-hover:text-amber-400 transition-colors">{title}</p>
        <p className="text-xs text-foreground/50 font-mono mt-0.5">{value}</p>
      </div>
    </a>
  );
}
