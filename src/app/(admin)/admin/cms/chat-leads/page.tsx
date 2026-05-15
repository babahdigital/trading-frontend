'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { Search, Mail, Phone, MapPin, Megaphone, RefreshCw, MessageCircle, BellRing } from 'lucide-react';
import { buildWhatsAppLink, tryNormalizePhone } from '@/lib/phone';

const POLL_INTERVAL_MS = 30_000;

interface QuickTemplate {
  id: string;
  label: string;
  description: string;
  /** WA / email body — `{name}` + `{locale}` interpolated */
  body: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'welcome',
    label: 'Welcome (ID)',
    description: 'Salam pertama setelah lead masuk',
    body: 'Halo {name}, terima kasih sudah menghubungi BabahAlgo. Saya tim onboarding — mau bantu cek paket mana yang paling cocok dengan profil modal & risiko Anda. Boleh saya tanya 2-3 hal singkat?',
  },
  {
    id: 'demo-offer',
    label: 'Demo Offer (ID)',
    description: 'Ajak coba demo MT5 / Binance Testnet',
    body: 'Halo {name}, untuk verifikasi sistem secara aman, kami siapkan Demo Robot Meta (MT5) atau Robot Crypto (Binance Testnet) gratis 7 hari. Mau saya kirim setup guide-nya?',
  },
  {
    id: 'pricing-clarify',
    label: 'Pricing Clarify (ID)',
    description: 'Klarifikasi tier + zero-custody',
    body: 'Halo {name}, untuk konteks: BabahAlgo software-only, modal Anda tetap di akun broker (Exness/lain) atau Binance Anda sendiri — kami tidak custody dana. Tier mulai $19/bulan. Mau saya kirim breakdown perbandingan tier?',
  },
  {
    id: 'institutional',
    label: 'Institutional (EN)',
    description: 'B2B / family office inquiry',
    body: 'Hi {name}, thanks for reaching out. For institutional access we offer a B2B Service Agreement with custom API scope, dedicated VPS, and 24/7 priority support — pricing is usage-based. Would you like to schedule a 30-min call to walk through scope?',
  },
  {
    id: 'follow-up',
    label: 'Follow-up (ID)',
    description: 'Reminder setelah 3-5 hari diam',
    body: 'Halo {name}, sekedar follow-up dari chat sebelumnya — apakah ada pertanyaan tambahan? Kalau mau test akses portal atau lihat demo, saya bisa setup hari ini.',
  },
];

function interpolateTemplate(tpl: string, lead: { name: string; locale: string }): string {
  return tpl.replace(/\{name\}/g, lead.name).replace(/\{locale\}/g, lead.locale.toUpperCase());
}

interface ChatLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  locale: string;
  referrerPath: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  consentMarketing: boolean;
  status: 'NEW' | 'CONVERTED' | 'CONTACTED' | 'ARCHIVED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS: Array<ChatLead['status']> = ['NEW', 'CONTACTED', 'CONVERTED', 'ARCHIVED'];
const STATUS_COLORS: Record<ChatLead['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  NEW: 'default',
  CONTACTED: 'secondary',
  CONVERTED: 'outline',
  ARCHIVED: 'secondary',
};

export default function CmsChatLeadsPage() {
  const { getAuthHeaders } = useAuth();
  const toast = useToast();
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [selected, setSelected] = useState<ChatLead | null>(null);
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [composedReply, setComposedReply] = useState('');
  const lastNewCountRef = useRef<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLeads = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (debouncedSearch) params.set('q', debouncedSearch);
    params.set('limit', '100');
    const res = await fetch(`/api/admin/cms/chat-leads?${params.toString()}`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
      setCounts(data.counts ?? {});
      // Toast notif kalau ada lead NEW baru saat polling silent
      const newCount = (data.counts ?? {}).NEW ?? 0;
      if (silent && lastNewCountRef.current !== null && newCount > lastNewCountRef.current) {
        const delta = newCount - lastNewCountRef.current;
        toast.push({
          tone: 'info',
          title: `${delta} lead baru masuk`,
          description: 'Refresh untuk lihat detail terbaru.',
        });
      }
      lastNewCountRef.current = newCount;
      setLastSync(new Date());
    }
    setLoading(false);
    setRefreshing(false);
  }, [getAuthHeaders, statusFilter, debouncedSearch, toast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Auto-poll every 30s untuk feel "real-time" tanpa WebSocket overhead.
  // Silent mode = no full-page skeleton, hanya refreshing spinner indicator.
  useEffect(() => {
    const interval = setInterval(() => {
      // Skip polling kalau user sedang aktif compose reply (avoid janky refresh)
      if (selected && composedReply.length > 0) return;
      fetchLeads({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchLeads, selected, composedReply]);

  async function updateLead(id: string, payload: { status?: string; notes?: string }) {
    await fetch('/api/admin/cms/chat-leads', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, ...payload }),
    });
    setSelected(null);
    fetchLeads();
  }

  const consentCount = useMemo(() => leads.filter((l) => l.consentMarketing).length, [leads]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <CmsPageHeader
            title="Chat Leads"
            description="Live feed lead dari chat AI. Auto-refresh tiap 30 detik. Newsletter consent otomatis terhubung ke tabel Subscriber."
          />
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`relative flex h-2 w-2`}>
                <span className={`${refreshing ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live · sync {lastSync ? `${Math.max(0, Math.floor((Date.now() - lastSync.getTime()) / 1000))}s lalu` : '—'}
            </span>
            <Button size="sm" variant="outline" onClick={() => fetchLeads()} disabled={loading || refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>
            Total: <span className="font-semibold text-foreground">{total}</span>
          </span>
          {STATUS_OPTIONS.map((s) => {
            const count = counts[s] ?? 0;
            const isNewWithCount = s === 'NEW' && count > 0;
            return (
              <span key={s} className={isNewWithCount ? 'inline-flex items-center gap-1' : undefined}>
                {isNewWithCount && <BellRing className="h-3 w-3 text-amber-500 dark:text-amber-400" aria-hidden />}
                {s}: <span className={`font-semibold ${isNewWithCount ? 'text-amber-600 dark:text-amber-300' : 'text-foreground'}`}>{count}</span>
              </span>
            );
          })}
          <span>
            Newsletter consent (page): <span className="font-semibold text-foreground">{consentCount}</span>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama / email / telpon…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Detail panel */}
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Detail Lead — {selected.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={`mailto:${selected.email}`} className="hover:underline">{selected.email}</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {(() => {
                  const norm = tryNormalizePhone(selected.phone);
                  const waLink = buildWhatsAppLink(selected.phone, `Halo ${selected.name}, terima kasih sudah menghubungi BabahAlgo.`);
                  return waLink ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-[hsl(var(--profit))]"
                      title={`Click to chat via WhatsApp · ${norm?.country ?? '?'}`}
                    >
                      {norm?.international ?? selected.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground" title="Phone format invalid">
                      {selected.phone}
                    </span>
                  );
                })()}
              </div>
              <div>
                <span className="text-muted-foreground">Locale:</span> {selected.locale.toUpperCase()}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">From:</span> {selected.referrerPath || '(unknown)'}
              </div>
              <div>
                <span className="text-muted-foreground">IP:</span> {selected.ipAddress || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Marketing:</span>{' '}
                {selected.consentMarketing ? (
                  <Badge variant="outline" className="ml-1"><Megaphone className="h-3 w-3 mr-1" />Opt-in</Badge>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
            {selected.userAgent && (
              <div className="text-xs text-muted-foreground/80 break-all border border-border rounded p-2 bg-muted/40">
                {selected.userAgent}
              </div>
            )}

            {/* Quick-reply templates — pre-filled message untuk paste ke WA/Email */}
            <div className="space-y-3 rounded-md border border-border/70 bg-card/50 p-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Quick Reply Templates
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setActiveTemplate(tpl.id);
                      setComposedReply(interpolateTemplate(tpl.body, selected));
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                      activeTemplate === tpl.id
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                        : 'bg-card border-border hover:border-amber-500/30 text-foreground/85'
                    }`}
                    title={tpl.description}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
              {activeTemplate && (
                <>
                  <Textarea
                    value={composedReply}
                    onChange={(e) => setComposedReply(e.target.value)}
                    rows={4}
                    placeholder="Edit pesan sebelum kirim…"
                    className="text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const waLink = buildWhatsAppLink(selected.phone, composedReply);
                      return waLink ? (
                        <Button size="sm" variant="default" asChild>
                          <a href={waLink} target="_blank" rel="noopener noreferrer">
                            <Phone className="h-3.5 w-3.5 mr-1.5" /> Kirim via WhatsApp
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="default" disabled title="Format nomor tidak valid untuk WA">
                          <Phone className="h-3.5 w-3.5 mr-1.5" /> WhatsApp (invalid)
                        </Button>
                      );
                    })()}
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={`mailto:${selected.email}?subject=${encodeURIComponent('Tentang BabahAlgo')}&body=${encodeURIComponent(composedReply)}`}
                      >
                        <Mail className="h-3.5 w-3.5 mr-1.5" /> Kirim via Email
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard?.writeText(composedReply).then(() => {
                          toast.push({ tone: 'success', title: 'Pesan disalin ke clipboard' });
                        });
                      }}
                    >
                      Salin
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setActiveTemplate(null); setComposedReply(''); }}>
                      Batal
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Catatan internal</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Hasil follow-up, status komunikasi, dll."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" onClick={() => updateLead(selected.id, { status: 'CONTACTED', notes })}>
                Mark Contacted
              </Button>
              <Button size="sm" variant="default" onClick={() => updateLead(selected.id, { status: 'CONVERTED', notes })}>
                Mark Converted
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateLead(selected.id, { status: 'ARCHIVED', notes })}>
                Archive
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateLead(selected.id, { notes })}>
                Save Notes
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Tutup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Memuat...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          Belum ada chat lead yang masuk dengan filter ini.
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                setSelected(lead);
                setNotes(lead.notes || '');
              }}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{lead.name}</span>
                    <Badge variant={STATUS_COLORS[lead.status]}>{lead.status}</Badge>
                    {lead.consentMarketing && (
                      <Badge variant="outline" className="text-xs">
                        <Megaphone className="h-3 w-3 mr-1" />
                        Newsletter
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{lead.locale.toUpperCase()}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{lead.email}</span>
                    <span>{lead.phone}</span>
                    {lead.referrerPath && <span>· {lead.referrerPath}</span>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
