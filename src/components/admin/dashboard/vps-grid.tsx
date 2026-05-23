'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconCircle } from '@/components/ui/icon';
import { formatDateTime } from '@/lib/format-locale';
import { vpsStatusBadge } from '@/lib/admin/badges';

export interface VpsStatus {
  id: string;
  name: string;
  region: string;
  status: string;
  lastHealthStatus: string | null;
  lastHealthCheckAt: string | null;
}

export interface VpsGridProps {
  vpsInstances: VpsStatus[];
}

export function VpsGrid({ vpsInstances }: VpsGridProps) {
  if (vpsInstances.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">VPS Client Status</h3>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {vpsInstances.map((vps) => {
          const meta = vpsStatusBadge(vps.status, vps.lastHealthStatus);
          const isOnline = meta.tone === 'success';
          return (
            <Card key={vps.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconCircle icon={isOnline ? Wifi : WifiOff} size="sm" tone={isOnline ? 'success' : 'danger'} />
                    <span className="font-semibold truncate">{vps.name}</span>
                  </div>
                  <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider', meta.cls)}>
                    {meta.label}
                  </span>
                </div>
                <dl className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <dt>Region</dt>
                    <dd className="font-mono">{vps.region || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Last check</dt>
                    <dd>{vps.lastHealthCheckAt ? formatDateTime(vps.lastHealthCheckAt) : '-'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
