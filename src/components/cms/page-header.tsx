'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CmsPageHeaderProps {
  title: string;
  description?: string;
  previewUrl?: string;
}

export function CmsPageHeader({ title, description, previewUrl }: CmsPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {previewUrl && (
        <Button variant="outline" size="sm" asChild>
          <Link href={previewUrl} target="_blank" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Preview
          </Link>
        </Button>
      )}
    </div>
  );
}
