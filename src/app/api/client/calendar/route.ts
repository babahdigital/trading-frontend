import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';

export async function GET(_request: NextRequest) {

  try {
    // Use VPS-specific or master backend
    const resp = await proxyToMasterBackend('/api/calendar');

    if (!resp.ok) {
      return NextResponse.json({ events: [] });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ events: [] });
  }
}
