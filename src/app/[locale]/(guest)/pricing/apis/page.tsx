import { redirect } from 'next/navigation';

/**
 * /pricing/apis adalah anchor di /pricing#apis. Redirect 308 supaya CTA
 * mega menu + pricing card link tetap konsisten.
 */
export default function ApisPricingRedirect() {
  redirect('/pricing#apis');
}
