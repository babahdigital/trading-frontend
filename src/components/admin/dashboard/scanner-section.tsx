'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScannerHeatmap } from '@/components/charts/scanner-heatmap';
import { EmptyState } from '@/components/admin/empty-state';

export interface AiState {
  pair: string;
  status: string;
  action: string;
  confidence: number;
  condition: string;
  updatedAgo: string;
}

export interface ScannerPair {
  pair: string;
  score: number;
  status: 'active' | 'standby' | 'off';
  breakdown?: {
    smc: number;
    wyckoff: number;
    zone: number;
    sr: number;
    session: number;
  };
}

export interface ScannerSectionProps {
  scannerPairs: ScannerPair[];
  aiStates: AiState[];
  scannerError?: string | null;
  statusError?: string | null;
}

export function ScannerSection({ scannerPairs, aiStates, scannerError, statusError }: ScannerSectionProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Scanner Heatmap (14 Pairs)</CardTitle>
        </CardHeader>
        <CardContent>
          {scannerError && (
            <div role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2 mb-3">
              {scannerError}
            </div>
          )}
          {scannerPairs.length > 0 ? (
            <div className="w-full min-w-0">
              <ScannerHeatmap pairs={scannerPairs} mode="admin" />
            </div>
          ) : (
            <EmptyState
              variant="inline"
              icon={Activity}
              title="Belum ada data scanner"
              description="Hubungkan VPS backend untuk mulai membaca scanner."
              size="sm"
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">AI State Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          {statusError && (
            <div role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2 mb-3">
              {statusError}
            </div>
          )}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {aiStates.length > 0 ? aiStates.map((ai) => (
              <div key={ai.pair} className="border rounded-lg p-3 bg-card hover:bg-muted/40 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold font-mono text-sm">{ai.pair}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    ai.status.includes('MONITOR') ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
                    ai.status.includes('SIGNAL') || ai.status.includes('BUY') || ai.status.includes('SELL') ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
                    'bg-slate-500/15 text-slate-700 dark:text-slate-300',
                  )}>
                    {ai.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Action: <span className="font-mono">{ai.action}</span> (conf: {ai.confidence.toFixed(2)})</div>
                  <div>Condition: {ai.condition}</div>
                  <div className="text-[10px]">Updated: {ai.updatedAgo}</div>
                </div>
              </div>
            )) : (
              <EmptyState
                variant="inline"
                icon={Activity}
                title="Belum ada data AI state"
                description="Hubungkan VPS backend untuk live AI monitor."
                size="sm"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
