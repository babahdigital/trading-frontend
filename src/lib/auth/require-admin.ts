import { NextRequest, NextResponse } from 'next/server';
import { isAdminRole } from './jwt';

/**
 * Verifikasi bahwa request berasal dari admin yang terautentikasi.
 * Header x-user-role di-set oleh middleware setelah JWT valid.
 * Defense-in-depth: jika middleware di-bypass, route tetap aman.
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const role = request.headers.get('x-user-role');
  if (!role || !isAdminRole(role)) {
    return NextResponse.json({ code: 'forbidden', error: 'Forbidden — admin access required' }, { status: 403 });
  }
  return null;
}
