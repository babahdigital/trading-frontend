'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDateTime } from '@/lib/format-locale';

export interface AuditEntry {
  id: string;
  createdAt: string;
  userId: string | null;
  action: string;
  user?: { email: string; name: string | null } | null;
}

export interface AuditSectionProps {
  auditEntries: AuditEntry[];
  error?: string | null;
}

export function AuditSection({ auditEntries, error }: AuditSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Audit Log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2 mx-4 mt-3">
            {error}
          </div>
        )}
        {auditEntries.length === 0 ? (
          <div className="p-6">
            <EmptyState
              variant="inline"
              icon={Activity}
              title="Belum ada aktivitas audit"
              size="sm"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">Waktu</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-accent/50 transition-colors">
                    <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="p-3">{entry.user?.name || entry.user?.email || entry.userId || '-'}</td>
                    <td className="p-3 font-mono text-xs">{entry.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
