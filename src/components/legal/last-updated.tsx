'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

/**
 * Per-document "last updated" line for legal pages. Sources the real CMS
 * PageContent.updatedAt for the given slug (locale-formatted) instead of the
 * single shared static date that previously made all five legal pages claim the
 * same effective date. Falls back to the shared `last_updated` string when the
 * document has no CMS row yet. (P2-DI-9)
 */
export function LegalLastUpdated({ slug }: { slug: string }) {
  const t = useTranslations('legal_chrome');
  const locale = useLocale();
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/public/pages?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d?.updatedAt) setUpdatedAt(d.updatedAt as string); })
      .catch(() => { /* keep fallback */ });
    return () => { active = false; };
  }, [slug]);

  const text = updatedAt
    ? `${t('last_updated_prefix')}: ${new Date(updatedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : t('last_updated');

  return <p className="t-body-sm text-foreground/60">{text}</p>;
}
