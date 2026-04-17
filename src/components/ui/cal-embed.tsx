'use client';

import Cal, { getCalApi } from '@calcom/embed-react';
import { useEffect } from 'react';

interface CalEmbedProps {
  calLink: string;
  className?: string;
}

export function CalEmbed({ calLink, className }: CalEmbedProps) {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal('ui', {
        theme: 'dark',
        cssVarsPerTheme: {
          dark: {
            'cal-bg': 'transparent',
            'cal-text': 'var(--foreground)',
            'cal-text-emphasis': 'var(--foreground)',
            'cal-border-subtle': 'var(--border)',
          },
          light: {
            'cal-bg': 'transparent',
            'cal-text': 'var(--foreground)',
            'cal-text-emphasis': 'var(--foreground)',
            'cal-border-subtle': 'var(--border)',
          },
        },
        hideEventTypeDetails: false,
        layout: 'month_view',
      });
    })();
  }, []);

  return (
    <div className={className}>
      <Cal
        calLink={calLink}
        style={{ width: '100%', height: '100%', overflow: 'auto', minHeight: '500px' }}
        config={{
          layout: 'month_view',
          theme: 'dark',
        }}
      />
    </div>
  );
}
