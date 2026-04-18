import type { Signal } from '@/types/signal';

interface Subscriber {
  tier: string;
  language: string;
  timezone: string;
  user: { name: string | null; email: string };
}

export function formatSignalTelegram(signal: Signal, sub: Subscriber): string {
  const emoji = signal.direction === 'BUY' ? '\u{1F7E2}' : '\u{1F534}';
  const ts = new Date(signal.emitted_at).toLocaleString(
    sub.language === 'id' ? 'id-ID' : 'en-US',
    { timeZone: sub.timezone, timeStyle: 'short', dateStyle: 'medium' },
  );

  const entry = signal.entry_price_hint ? `*Entry*: ~${signal.entry_price_hint}` : '';
  const tp = signal.take_profit ? `*TP*: ${signal.take_profit}` : '';
  const sl = signal.stop_loss ? `*SL*: ${signal.stop_loss}` : '';
  const reasoning = signal.reasoning.length > 300
    ? signal.reasoning.slice(0, 300) + '...'
    : signal.reasoning;

  if (sub.language === 'id') {
    return [
      `${emoji} *SINYAL ${signal.direction} ${signal.pair}*`,
      '',
      `*Setup*: ${signal.entry_type}`,
      `*Confidence*: ${Math.round(signal.confidence * 100)}%`,
      `*Kondisi*: ${signal.market_condition ?? 'N/A'}`,
      '',
      entry,
      tp,
      sl,
      '',
      `*Analisa*:`,
      reasoning,
      '',
      ts + ' WITA',
      '',
      '_Bukan saran investasi. Trading berisiko tinggi._',
      '_Manage your own risk. Lihat ToS di babahalgo.com/legal/terms_',
    ].filter(Boolean).join('\n').trim();
  }

  return [
    `${emoji} *${signal.direction} ${signal.pair} SIGNAL*`,
    '',
    `*Setup*: ${signal.entry_type}`,
    `*Confidence*: ${Math.round(signal.confidence * 100)}%`,
    `*Condition*: ${signal.market_condition ?? 'N/A'}`,
    '',
    entry,
    tp,
    sl,
    '',
    `*Analysis*:`,
    reasoning,
    '',
    ts,
    '',
    '_Not financial advice. Trading involves substantial risk._',
    '_Manage your own risk. See ToS at babahalgo.com/legal/terms_',
  ].filter(Boolean).join('\n').trim();
}

export function formatSignalEmail(
  signal: Signal,
  sub: Subscriber,
): { subject: string; html: string } {
  const emoji = signal.direction === 'BUY' ? '\u{1F7E2}' : '\u{1F534}';
  const isID = sub.language === 'id';
  const confPct = Math.round(signal.confidence * 100);
  const subject = isID
    ? `${emoji} Sinyal ${signal.direction} ${signal.pair} (${confPct}%)`
    : `${emoji} ${signal.direction} ${signal.pair} Signal (${confPct}%)`;

  const bgColor = signal.direction === 'BUY' ? '#10b981' : '#ef4444';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${bgColor}; color: white; padding: 20px; border-radius: 8px;">
    <h1 style="margin: 0; font-size: 24px;">${emoji} ${signal.direction} ${signal.pair}</h1>
    <p style="margin: 8px 0 0;">Confidence: ${confPct}% &bull; ${signal.entry_type}</p>
  </div>
  <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Entry</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${signal.entry_price_hint ?? '-'}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>TP</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${signal.take_profit ?? '-'}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>SL</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${signal.stop_loss ?? '-'}</td></tr>
    <tr><td style="padding: 8px;"><strong>${isID ? 'Kondisi' : 'Condition'}</strong></td><td style="padding: 8px;">${signal.market_condition ?? 'N/A'}</td></tr>
  </table>
  <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
    <h3 style="margin-top: 0;">${isID ? 'Analisa' : 'Analysis'}</h3>
    <p style="margin: 0;">${signal.reasoning}</p>
  </div>
  <p style="margin-top: 30px; padding: 16px; background: #fef3c7; border-radius: 8px; font-size: 12px; color: #92400e;">
    ${isID ? 'Bukan saran investasi. Trading berisiko tinggi.' : 'Not financial advice. Trading involves substantial risk.'}
    <br><a href="https://babahalgo.com/legal/terms">ToS</a> &bull; <a href="https://babahalgo.com/legal/risk-disclosure">Risk Disclosure</a>
  </p>
  <p style="font-size: 10px; color: #9ca3af; margin-top: 20px;">
    Unsubscribe: <a href="https://babahalgo.com/portal/account/notifications">Settings</a>
  </p>
</body>
</html>`;

  return { subject, html };
}
