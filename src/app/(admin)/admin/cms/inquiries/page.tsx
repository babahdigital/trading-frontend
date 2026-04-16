'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';

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

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  async function updateStatus(id: string, status: string) {
    await fetch('/api/admin/cms/inquiries', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, status, notes }),
    });
    setSelected(null);
    fetchInquiries();
  }

  return (
    <div className="space-y-6">
      <div>
        <CmsPageHeader title="Inquiries" description="Kelola inquiry/konsultasi dari calon pelanggan." />
        <p className="text-muted-foreground">Total: {total} permintaan konsultasi dari calon klien.</p>
      </div>

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

      {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <Card key={inq.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setSelected(inq); setNotes(inq.notes || ''); }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{inq.name}</span>
                    <Badge variant={STATUS_COLORS[inq.status] || 'secondary'}>{inq.status}</Badge>
                    <span className="text-xs text-muted-foreground">{inq.package}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate max-w-lg">{inq.message}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(inq.createdAt).toLocaleDateString()}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
