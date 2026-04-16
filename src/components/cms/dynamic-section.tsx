'use client';

import Image from 'next/image';

interface DynamicSectionProps {
  slug: string;
  title: string;
  subtitle: string | null;
  content: Record<string, unknown>;
}

/**
 * Render section CMS yang tidak punya template khusus di landing-client.
 * Admin bisa menambah section baru lewat CMS, dan section akan muncul
 * dengan layout generik (title + subtitle + content blocks).
 */
export function DynamicSection({ slug, title, subtitle, content }: DynamicSectionProps) {
  const heading = content.heading as string || title;
  const body = content.body as string || '';
  const items = Array.isArray(content.items) ? content.items as Array<{ title?: string; desc?: string; icon?: string }> : [];
  const imageUrl = content.imageUrl as string || '';
  const ctaLabel = content.ctaLabel as string || '';
  const ctaLink = content.ctaLink as string || '';

  return (
    <section id={slug} className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{heading}</h2>
          {subtitle && <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>}
        </div>

        {body && (
          <div className="max-w-3xl mx-auto text-center text-muted-foreground mb-8">
            <p>{body}</p>
          </div>
        )}

        {imageUrl && (
          <div className="flex justify-center mb-8">
            <Image src={imageUrl} alt={heading} width={800} height={400} className="rounded-xl max-w-full max-h-96 object-cover" />
          </div>
        )}

        {items.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, i) => (
              <div key={i} className="border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                {item.icon && <div className="text-2xl mb-3">{item.icon}</div>}
                {item.title && <h3 className="text-lg font-semibold mb-2">{item.title}</h3>}
                {item.desc && <p className="text-sm text-muted-foreground">{item.desc}</p>}
              </div>
            ))}
          </div>
        )}

        {ctaLabel && ctaLink && (
          <div className="text-center mt-8">
            <a href={ctaLink} className="inline-block px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              {ctaLabel}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
