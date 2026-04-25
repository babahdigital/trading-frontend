import { redirect } from 'next/navigation';

/**
 * PAMM tier dihentikan 2026-04-26. Customer sekarang trade di akun broker
 * sendiri (model affiliate) dengan signal/VPS license/Crypto Bot.
 * Redirect 308 ke /solutions/signal.
 */
export default function DeprecatedPammPage() {
  redirect('/solutions/signal');
}
