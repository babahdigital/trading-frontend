'use client';

import { useEffect, useRef, useState } from 'react';
import { ArticleCardImage } from './article-card-image';

interface LazyArticleImageProps {
  slug: string;
  alt: string;
  category?: string;
  aspectClass?: string;
}

export function LazyArticleImage({ slug, alt, category, aspectClass }: LazyArticleImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || loaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setLoaded(true);
        fetch(`/api/public/articles?slug=${encodeURIComponent(slug)}&fields=imageUrl`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data?.imageUrl) setImageUrl(data.imageUrl); })
          .catch(() => {});
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [slug, loaded]);

  return (
    <div ref={ref}>
      <ArticleCardImage
        imageUrl={imageUrl}
        alt={alt}
        category={category}
        aspectClass={aspectClass}
      />
    </div>
  );
}
