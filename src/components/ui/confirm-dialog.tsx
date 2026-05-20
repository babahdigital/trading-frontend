'use client';

/**
 * useConfirm — promise-based replacement for native window.confirm().
 *
 * Pattern:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Delete user?',
 *     description: 'Licenses akan ikut terhapus.',
 *     confirmLabel: 'Delete',
 *     tone: 'destructive',
 *   });
 *   if (!ok) return;
 *
 * Backed by Radix Dialog primitive — fully accessible (focus trap, ESC,
 * aria-labels). Resolves false on overlay click / ESC / cancel button,
 * resolves true on confirm button. Single dialog instance in tree.
 */
import * as React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { cn } from '@/lib/utils';

type ConfirmTone = 'default' | 'destructive' | 'warning';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = React.useState<ConfirmRequest | null>(null);

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ ...opts, resolve });
    });
  }, []);

  const close = React.useCallback(
    (result: boolean) => {
      if (request) {
        request.resolve(result);
        setRequest(null);
      }
    },
    [request],
  );

  const tone = request?.tone ?? 'default';
  const Icon = tone === 'destructive' ? AlertTriangle : tone === 'warning' ? AlertTriangle : Info;
  const iconCls =
    tone === 'destructive'
      ? 'text-red-400 bg-red-500/10 border-red-500/30'
      : tone === 'warning'
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        : 'text-blue-400 bg-blue-500/10 border-blue-500/30';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={!!request}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                  iconCls,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <DialogTitle>{request?.title ?? ''}</DialogTitle>
                {request?.description && (
                  <DialogDescription className="mt-1.5 whitespace-pre-line">
                    {request.description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => close(false)}>
              {request?.cancelLabel ?? 'Batal'}
            </Button>
            <Button
              variant={tone === 'destructive' ? 'destructive' : 'default'}
              onClick={() => close(true)}
              autoFocus
            >
              {request?.confirmLabel ?? 'Lanjutkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be called inside <ConfirmProvider>');
  }
  return ctx;
}
