'use client';

import { useState } from 'react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';

export default function RegisterVpsPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/client/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, package: 'VPS_LICENSE' }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(
          data.error?.fieldErrors
            ? Object.values(data.error.fieldErrors).flat().join(', ')
            : 'Terjadi kesalahan'
        );
      }
    } catch {
      setError('Gagal mengirim. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      <main id="main-content">
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <div className="max-w-md mx-auto">
              {submitted ? (
                <div className="card-enterprise text-center">
                  <div className="text-4xl mb-4">&#9989;</div>
                  <h2 className="t-display-sub mb-2">Terima Kasih!</h2>
                  <p className="t-lead text-foreground/60 mb-6">
                    Tim kami akan menghubungi Anda dalam 1x24 jam untuk konsultasi lebih lanjut
                    mengenai VPS License.
                  </p>
                  <Link
                    href="/"
                    className="text-foreground/50 hover:text-amber-400 transition-colors text-sm"
                  >
                    Kembali ke Beranda
                  </Link>
                </div>
              ) : (
                <>
                  <p className="t-eyebrow mb-4">Register</p>
                  <h1 className="t-display-sub mb-2">Konsultasi VPS License</h1>
                  <p className="t-lead text-foreground/60 mb-10">
                    VPS License dimulai dari $3,000 setup fee. Isi form di bawah dan tim kami akan
                    menghubungi Anda.
                  </p>

                  <div className="card-enterprise">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Nama Lengkap *</label>
                        <Input
                          value={form.name}
                          onChange={(e) => set('name', e.target.value)}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Email *</label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => set('email', e.target.value)}
                          placeholder="john@example.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">WhatsApp / Phone</label>
                        <Input
                          className="font-mono"
                          value={form.phone}
                          onChange={(e) => set('phone', e.target.value)}
                          placeholder="+628123456789"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Perusahaan / Institusi
                        </label>
                        <Input
                          value={form.company}
                          onChange={(e) => set('company', e.target.value)}
                          placeholder="Opsional"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Pesan *</label>
                        <Textarea
                          value={form.message}
                          onChange={(e) => set('message', e.target.value)}
                          placeholder="Ceritakan kebutuhan trading Anda, jumlah akun, budget estimasi, dll."
                          rows={4}
                          required
                        />
                      </div>
                      {error && (
                        <div className="t-body-sm text-red-400 bg-red-500/10 p-3 rounded-md">
                          {error}
                        </div>
                      )}
                      <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading ? 'Mengirim...' : 'Kirim Permintaan Konsultasi'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}
