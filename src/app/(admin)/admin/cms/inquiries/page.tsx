'use client';

import { useEffect, useState, useCallback } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDate } from '@/lib/format-locale';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';

interface InquiryItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  package: string;
  message: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  NEW: 'default',
  CONTACTED: 'secondary',
  IN_PROGRESS: 'outline',
  CLOSED: 'secondary',
  REJECTED: 'destructive',
};

export default function CmsInquiriesPage() {
  const { getAuthHeaders } = useAuth();
  const toast = useToast();
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InquiryItem | null>(null);
  const [notes, setNotes] = useState('');

  const fetchInquiries = useCallback(async () => {
    const res = await fetch('/api/admin/cms/inquiries', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setInquiries(data.inquiries);
      setTotal(data.total);
    }
    setLoading(false);
  }, [getAuthHeaders]);

  // fetchInquiries drives setState — intentional fetch on mount + refetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  async function updateStatus(id: string, status: string) {
    // Check res.ok + keep the detail panel open on failure. (P2-BUG-4)
    const res = await fetch('/api/admin/cms/inquiries', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, status, notes }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.push({ tone: 'error', title: 'Gagal memperbarui status', description: data.error ?? `HTTP ${res.status}` });
      return;
    }
    toast.push({ tone: 'success', title: 'Status diperbarui' });
    setSelected(null);
    fetchInquiries();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inquiries"
        description={`Kelola inquiry/konsultasi dari calon pelanggan. Total: ${total} permintaan dari calon klien.`}
      />

      {selected && (
        <Card>
          <CardHeader><CardTitle>Detail Inquiry - {selected.name}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {selected.email}</div>
              <div><span className="text-muted-foreground">Phone:</span> {selected.phone || '-'}</div>
              <div><span className="text-muted-foreground">Company:</span> {selected.company || '-'}</div>
              <div><span className="text-muted-foreground">Package:</span> {selected.package}</div>
            </div>
            <div className="bg-muted rounded-lg p-4 text-sm">{selected.message}</div>
            <div>
              <label className="text-sm font-medium mb-1 block">Admin Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Catatan internal..." />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['CONTACTED', 'IN_PROGRESS', 'CLOSED', 'REJECTED'].map((s) => (
                <Button key={s} size="sm" variant={s === 'REJECTED' ? 'destructive' : 'outline'} onClick={() => updateStatus(selected.id, s)}>
                  Mark as {s}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Tutup</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-12 rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : inquiries.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Belum ada inquiry masuk"
          description="Permintaan konsultasi dari calon klien akan muncul di sini."
        />
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <Card key={inq.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setSelected(inq); setNotes(inq.notes || ''); }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{inq.name}</span>
                    <Badge variant={STATUS_COLORS[inq.status] || 'secondary'}>{inq.status}</Badge>
                    <span className="text-xs text-muted-foreground">{inq.package}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate max-w-lg">{inq.message}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(inq.createdAt)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
