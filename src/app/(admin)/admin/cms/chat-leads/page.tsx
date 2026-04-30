'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Search, Mail, Phone, MapPin, Megaphone } from 'lucide-react';
import { buildWhatsAppLink, tryNormalizePhone } from '@/lib/phone';

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
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ChatLead | null>(null);
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
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
    }
    setLoading(false);
  }, [getAuthHeaders, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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
        <CmsPageHeader
          title="Chat Leads"
          description="Pre-flight gate calon customer dari chat AI. Newsletter consent otomatis terhubung ke tabel Subscriber."
        />
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>
            Total: <span className="font-semibold text-foreground">{total}</span>
          </span>
          {STATUS_OPTIONS.map((s) => (
            <span key={s}>
              {s}: <span className="font-semibold text-foreground">{counts[s] ?? 0}</span>
            </span>
          ))}
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
