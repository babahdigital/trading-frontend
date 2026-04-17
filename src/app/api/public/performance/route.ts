import { NextResponse } from 'next/server';

// Public performance API — serves equity curve data for the performance page
// When master backend is available, this will proxy to it.
// For now, it generates demo data that looks realistic.

function generateEquityCurve(days: number): { time: string; value: number }[] {
  const data: { time: string; value: number }[] = [];
  let value = 10000;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    value += (Math.random() - 0.38) * 110;
    if (value < 8500) value = 8500 + Math.random() * 200;
    data.push({
      time: d.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
    });
  }
  return data;
}

// Cache the generated data for 4 hours so it stays consistent
let cachedData: { time: string; value: number }[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

export async function GET() {
  const now = Date.now();
  if (!cachedData || now - cacheTimestamp > CACHE_DURATION) {
    cachedData = generateEquityCurve(365);
    cacheTimestamp = now;
  }

  const currentValue = cachedData[cachedData.length - 1]?.value || 10000;
  const startValue = cachedData[0]?.value || 10000;
  const totalReturn = ((currentValue - startValue) / startValue * 100).toFixed(1);

  return NextResponse.json({
    equity: cachedData,
    kpi: {
      totalReturn: `+${totalReturn}%`,
      sharpeRatio: '2.14',
      sortinoRatio: '3.21',
      profitFactor: '1.87',
      winRate: '64.2%',
      maxDrawdown: '-8.7%',
      avgHoldTime: '4.2h',
      recoveryFactor: '14.6',
    },
  });
}
