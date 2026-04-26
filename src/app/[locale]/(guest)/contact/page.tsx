import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import ContactForm from '@/components/forms/contact-form';
import { CalEmbed } from '@/components/ui/cal-embed';
import {
  Mail, MessageCircle, Send, Clock, MapPin,
  CalendarCheck, ShieldCheck, FileSignature, MessagesSquare,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const BRIEFING_AGENDA = [
  {
    icon: CalendarCheck,
    title: 'Tujuan & profil modal',
    desc: 'Lima belas menit pertama: kami dengar konteks Anda — horizon, tolerance risiko, kelas aset yang relevan.',
  },
  {
    icon: ShieldCheck,
    title: 'Walkthrough framework',
    desc: 'Demo langsung 12-layer risk control + arsitektur eksekusi. Ada akses ke audit log + equity statement live (kalau Anda ingin).',
  },
  {
    icon: FileSignature,
    title: 'NDA-friendly',
    desc: 'Untuk diskusi institusional yang sensitif — strategi kustom, mandate, atau white-label — kami siap menandatangani NDA sebelum sesi.',
  },
  {
    icon: MessagesSquare,
    title: 'Tanpa sales pressure',
    desc: 'Tidak ada follow-up yang memaksa, tidak ada hard close. Kami menjelaskan, Anda mengevaluasi. Lanjut atau tidak — sama-sama oke.',
  },
];

export default async function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero — engaging eksklusif tone */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">KONTAK</p>
            <h1 className="t-display-page mb-6">
              Mari bicara —<br className="hidden sm:block" /> tanpa skrip.
            </h1>
            <p className="t-lead text-foreground/65 max-w-2xl">
              Kami percaya percakapan yang baik dimulai dari pertanyaan yang tepat. Jadwalkan
              briefing 30 menit dengan tim quant kami atau gunakan kanal langsung di bawah —
              kami merespons setiap pesan secara personal.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
              </span>
              Founding members beta — verifikasi manual
            </div>
          </div>
        </section>

        {/* What to expect — agenda 4 quadrant */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">AGENDA BRIEFING</p>
            <h2 className="t-display-sub mb-4">Apa yang Anda dapat dari 30 menit kami</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              Briefing dirancang sebagai due diligence dua arah. Anda menilai kami,
              kami menilai apakah platform kami cocok dengan kebutuhan Anda.
              Tidak ada deck panjang yang berulang-ulang.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {BRIEFING_AGENDA.map((item) => (
                <div key={item.title} className="rounded-xl border border-border/80 bg-card p-6 sm:p-7">
                  <div className="icon-container mb-4">
                    <item.icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="font-display text-xl font-medium mb-2">{item.title}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Schedule a Call */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">JADWAL</p>
            <h2 className="t-display-sub mb-3">Pilih waktu yang sesuai</h2>
            <p className="t-body-sm text-foreground/60 mb-8 max-w-xl">
              15 atau 30 menit, via Google Meet. Untuk briefing eksekutif yang lebih panjang
              atau on-site di Jakarta, hubungi tim kami lewat email institusional di bawah.
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
                <p className="t-eyebrow mb-3">PESAN ASYNC</p>
                <h2 className="t-display-sub mb-3">Lebih nyaman tulis dulu?</h2>
                <p className="t-body-sm text-foreground/60 mb-8 max-w-lg">
                  Sebagian klien lebih suka mempersiapkan pertanyaan tertulis. Tinggalkan
                  pesan — kami balas via email dalam 1–2 hari kerja, dengan jawaban yang
                  ditulis tim, bukan template.
                </p>
                <ContactForm />
              </div>

              {/* Right: Direct Channels (40%) */}
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">KANAL LANGSUNG</p>
                <h2 className="t-display-sub mb-3">Hubungi kami langsung</h2>
                <p className="t-body-sm text-foreground/60 mb-8">
                  Untuk pertanyaan urgent atau konteks teknis yang spesifik —
                  kanal-kanal ini dipantau langsung oleh tim, bukan bot.
                </p>
                <div className="space-y-3">
                  <ChannelCard
                    icon={<Mail className="w-5 h-5" />}
                    title="Pertanyaan umum"
                    href="mailto:hello@babahalgo.com"
                    value="hello@babahalgo.com"
                  />
                  <ChannelCard
                    icon={<Mail className="w-5 h-5" />}
                    title="Inquiry institusional"
                    href="mailto:ir@babahalgo.com"
                    value="ir@babahalgo.com"
                  />
                  <ChannelCard
                    icon={<MessageCircle className="w-5 h-5" />}
                    title="WhatsApp business hours"
                    href="https://wa.me/6281234567890"
                    value="+62 · WIB office hours"
                  />
                  <ChannelCard
                    icon={<Send className="w-5 h-5" />}
                    title="Telegram"
                    href="https://t.me/babahalgo"
                    value="@babahalgo"
                  />

                  <div className="border-t border-border/60 mt-6 pt-6 space-y-5">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium mb-1">Operasi</p>
                        <p className="text-sm text-foreground/65">CV Babah Digital · Indonesia</p>
                        <p className="text-xs text-foreground/50 mt-0.5">
                          Briefing on-site tersedia di Jakarta atas permintaan.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium mb-1">Waktu respons</p>
                        <p className="text-xs text-foreground/55 leading-relaxed">
                          1–2 hari kerja untuk pesan async. Untuk akun urgent, gunakan
                          WhatsApp atau email dengan tag <span className="font-mono text-amber-400">[URGENT]</span> di subject.
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
      className="flex items-center gap-4 p-4 rounded-lg border border-border/60 bg-card hover:border-amber-500/30 transition-all group"
    >
      <div className="icon-container shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium group-hover:text-amber-400 transition-colors truncate">{title}</p>
        <p className="text-xs text-foreground/50 font-mono mt-0.5 truncate">{value}</p>
      </div>
    </a>
  );
}
