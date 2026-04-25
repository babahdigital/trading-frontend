import { redirect } from 'next/navigation';

/**
 * PAMM registration dihentikan 2026-04-26. Redirect ke /register/signal
 * (model affiliate broker — customer trade di akun sendiri).
 */
export default function DeprecatedRegisterPammPage() {
  redirect('/register/signal');
}
