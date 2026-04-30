/**
 * Email template loader + variable interpolation.
 *
 * Storage: EmailTemplate Prisma model. Slug-based lookup
 * (welcome_user, password_reset, lead_confirmation, dst).
 *
 * Variable substitution: simple {{variable}} replacement. Tidak Mustache,
 * tidak HTML escape — author template tanggung jawab pakai variable
 * yang aman (variables typically dari kontrol kita: user_name, site_url,
 * dll). Jangan inject raw user input ke HTML body — escape dulu.
 */
import { prisma } from '@/lib/db/prisma';
import { getCompanySettings } from '@/lib/company/settings';
import { sendEmail } from '@/lib/notifier/email';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com';

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string | null;
}

export type Locale = 'id' | 'en';

export type TemplateVariables = Record<string, string | number | undefined | null>;

function interpolate(template: string, vars: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * Load template by slug + interpolate variables.
 * Pre-fills "global" variables otomatis: site_url, company_name.
 */
export async function renderTemplate(
  slug: string,
  locale: Locale,
  vars: TemplateVariables = {},
): Promise<RenderedTemplate | null> {
  const tpl = await prisma.emailTemplate.findUnique({ where: { slug } });
  if (!tpl || !tpl.isActive) return null;

  const company = await getCompanySettings();
  const merged: TemplateVariables = {
    site_url: SITE_URL,
    company_name: company.name,
    company_legal_entity: company.legalEntity,
    company_email: company.emailGeneral,
    ...vars,
  };

  const subjectTpl = locale === 'en' ? tpl.subject_en : tpl.subject_id;
  const bodyTpl = locale === 'en' ? tpl.body_en : tpl.body_id;
  const textTpl = locale === 'en' ? tpl.text_en : tpl.text_id;

  return {
    subject: interpolate(subjectTpl, merged),
    html: interpolate(bodyTpl, merged),
    text: textTpl ? interpolate(textTpl, merged) : null,
  };
}

/**
 * Convenience: render + send. Throws kalau template tidak ada atau
 * provider error (delegate ke sendEmail).
 */
export async function sendTemplatedEmail(
  to: string,
  slug: string,
  locale: Locale,
  vars: TemplateVariables = {},
  opts: { skipUnsubHeader?: boolean } = {},
): Promise<{ messageId: string }> {
  const rendered = await renderTemplate(slug, locale, vars);
  if (!rendered) {
    throw new Error(`email_template_not_found: ${slug}`);
  }
  return sendEmail(to, {
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text ?? undefined,
    skipUnsubHeader: opts.skipUnsubHeader,
  });
}
