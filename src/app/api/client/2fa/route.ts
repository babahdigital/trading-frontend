import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserIdFromRequest } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { verifyTotp } from '@/lib/auth/totp';
import { createHmac, randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  return output;
}

function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}


function generateRecoveryCodes(n = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    codes.push(randomBytes(5).toString('hex').toUpperCase().match(/.{1,4}/g)!.join('-'));
  }
  return codes;
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFaEnabled: true },
  });
  return NextResponse.json({
    enabled: !!user?.twoFaEnabled,
    email: user?.email ?? null,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as 'setup' | 'verify' | 'disable';

  if (action === 'setup') {
    const secretBase32 = base32Encode(randomBytes(20));
    await prisma.user.update({
      where: { id: userId },
      data: { twoFaSecret: secretBase32, twoFaEnabled: false },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const label = encodeURIComponent(`BabahAlgo:${user?.email ?? userId}`);
    const issuer = encodeURIComponent('BabahAlgo');
    const otpauth = `otpauth://totp/${label}?secret=${secretBase32}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    return NextResponse.json({ secret: secretBase32, otpauth });
  }

  if (action === 'verify') {
    const code = String(body.code ?? '');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFaSecret: true } });
    if (!user?.twoFaSecret) return NextResponse.json({ error: 'no setup in progress' }, { status: 400 });
    if (!verifyTotp(user.twoFaSecret, code)) {
      return NextResponse.json({ error: 'invalid code' }, { status: 400 });
    }
    const recoveryCodes = generateRecoveryCodes();
    await prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: true, recoveryCodes },
    });
    return NextResponse.json({ ok: true, recoveryCodes });
  }

  if (action === 'disable') {
    const password = String(body.password ?? '');
    const code = String(body.code ?? '');
    if (!password) return NextResponse.json({ error: 'password required' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, twoFaSecret: true, twoFaEnabled: true },
    });
    if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });

    const validPw = await verifyPassword(password, user.passwordHash);
    if (!validPw) return NextResponse.json({ error: 'invalid password' }, { status: 403 });

    if (user.twoFaEnabled && user.twoFaSecret) {
      if (!verifyTotp(user.twoFaSecret, code)) {
        return NextResponse.json({ error: 'invalid 2FA code' }, { status: 403 });
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: false, twoFaSecret: null, recoveryCodes: [] },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}
