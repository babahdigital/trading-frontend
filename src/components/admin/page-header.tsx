/**
 * PageHeader — admin/portal page title + subtitle + actions primitive.
 *
 * Pattern yang sebelumnya tersebar inline (`<h2 className="text-3xl">` +
 * `<p className="text-muted-foreground">` + flex actions) di 38+ admin
 * pages — sekarang 1 primitive supaya konsisten typography, gap, dan
 * mobile wrap behavior.
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  /** Optional small label sebelum title (e.g. breadcrumb terakhir, modul) */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Right-side actions (buttons, badges). Bisa wrap di mobile. */
  actions?: ReactNode;
  /** Tambahan content di bawah header (e.g. filter bar, tabs). */
  children?: ReactNode;
  /** Spacing bottom — default `mb-6 lg:mb-8` */
  bottomSpacing?: 'tight' | 'default' | 'loose';
  className?: string;
}

const SPACING: Record<NonNullable<PageHeaderProps['bottomSpacing']>, string> = {
  tight:   'mb-4 lg:mb-6',
  default: 'mb-6 lg:mb-8',
  loose:   'mb-8 lg:mb-10',
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  bottomSpacing = 'default',
  className,
}: PageHeaderProps) {
  return (
    <header className={cn(SPACING[bottomSpacing], className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm sm:text-base text-muted-foreground max-w-2xl">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
