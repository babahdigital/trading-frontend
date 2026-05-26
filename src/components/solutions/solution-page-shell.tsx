import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { JsonLdScript } from '@/components/seo/json-ld-script';

interface SolutionPageShellProps {
  schemas?: Record<string, unknown>[];
  children: React.ReactNode;
  stickyBar?: React.ReactNode;
}

export function SolutionPageShell({ schemas, children, stickyBar }: SolutionPageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {schemas?.map((schema, i) => (
        <JsonLdScript key={i} schema={schema} />
      ))}
      <EnterpriseNav />
      <main id="main-content">
        {children}
        {stickyBar}
      </main>
      <EnterpriseFooter />
    </div>
  );
}
