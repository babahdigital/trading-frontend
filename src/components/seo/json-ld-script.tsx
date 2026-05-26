import { ldJson } from '@/lib/seo-jsonld';

interface JsonLdScriptProps {
  schema: Record<string, unknown>;
}

export function JsonLdScript({ schema }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: ldJson(schema) }}
    />
  );
}

interface MultiJsonLdProps {
  schemas: Record<string, unknown>[];
}

export function MultiJsonLd({ schemas }: MultiJsonLdProps) {
  return (
    <>
      {schemas.map((schema, i) => (
        <JsonLdScript key={i} schema={schema} />
      ))}
    </>
  );
}
