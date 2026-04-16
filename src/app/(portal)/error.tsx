'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[portal] Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-2xl">
        !
      </div>
      <h2 className="text-xl font-bold">Terjadi Kesalahan</h2>
      <p className="text-muted-foreground max-w-md">
        Portal mengalami error. Silakan coba lagi atau hubungi support jika masalah berlanjut.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono">Error ID: {error.digest}</p>
      )}
      <Button onClick={reset}>Coba Lagi</Button>
    </div>
  );
}
