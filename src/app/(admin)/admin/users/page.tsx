'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mt5Account: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { licenses: number; subscriptions: number };
}

function authHeaders(json = false) {
  const h: Record<string, string> = {
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'CLIENT',
    mt5Account: '',
  });

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name || undefined,
          role: form.role,
          mt5Account: form.mt5Account || undefined,
        }),
      });
      if (res.ok) {
        setForm({ email: '', password: '', name: '', role: 'CLIENT', mt5Account: '' });
        setShowForm(false);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create user');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">{total} registered users</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? 'Cancel' : 'Add User'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="user@example.com" required />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Password *</label>
                <Input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} placeholder="Min 8 characters" required />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <Input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => updateForm('role', e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="CLIENT">CLIENT</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">MT5 Account</label>
                <Input value={form.mt5Account} onChange={(e) => updateForm('mt5Account', e.target.value)} placeholder="MT5 account number" />
              </div>
              <div className="md:col-span-2 flex items-center gap-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create User'}
                </Button>
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">MT5</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Licenses</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No users found.</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4 font-medium">{user.name || '-'}</td>
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs">{user.mt5Account || '-'}</td>
                      <td className="p-4">{user._count.licenses}</td>
                      <td className="p-4 text-muted-foreground">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
