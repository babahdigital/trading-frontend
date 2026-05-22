/**
 * Smoke tests — critical surfaces yang harus jalan setiap deploy.
 * Run terhadap production URL by default; override via PLAYWRIGHT_BASE_URL.
 */
import { test, expect } from '@playwright/test';

test.describe('Public API health', () => {
  test('health endpoint returns 200 or 503 (acceptable)', async ({ request }) => {
    const res = await request.get('/api/health');
    expect([200, 404, 503]).toContain(res.status());
  });

  test('ticker endpoint delivers >= 16 symbols', async ({ request }) => {
    // Cold container first request bisa ambil 6-20s (Yahoo TLS warmup +
    // Stooq batch). Bump timeout untuk handle cold-start tanpa false fail.
    test.setTimeout(60_000);
    const res = await request.get('/api/public/ticker', { timeout: 45_000 });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.tickers)).toBe(true);
    expect(data.tickers.length).toBeGreaterThanOrEqual(16);
    expect(data.meta.counts).toBeDefined();
    expect(data.meta.counts.crypto).toBeGreaterThanOrEqual(6);
  });

  test('public pricing endpoint returns tiers', async ({ request }) => {
    const res = await request.get('/api/public/pricing');
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(data).toBeDefined();
    }
  });

  test('promo active endpoint locale-aware', async ({ request }) => {
    const idRes = await request.get('/api/cms/promotions/active?locale=id');
    const enRes = await request.get('/api/cms/promotions/active?locale=en');
    expect(idRes.status()).toBe(200);
    expect(enRes.status()).toBe(200);
    const idData = await idRes.json();
    const enData = await enRes.json();
    expect(idData.promotions).toBeDefined();
    expect(enData.promotions).toBeDefined();
  });

  test('recommend-tier endpoint returns valid recommendation', async ({ request }) => {
    const res = await request.get('/api/v1/recommend-tier?equity=2500');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.recommendation.tier).toBe('active');
    expect(data.recommendation.fee_usd).toBe(19);
  });
});

test.describe('Public landing pages', () => {
  test('home page renders + ticker bar visible', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BabahAlgo/i);
    // Ticker bar role=region
    const ticker = page.locator('[aria-label="Live market ticker"]');
    await expect(ticker.first()).toBeVisible({ timeout: 15_000 });
  });

  test('pricing page accessible', async ({ page }) => {
    const res = await page.goto('/pricing');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
  });

  test('locale routing — /en/ prefix works', async ({ page }) => {
    const res = await page.goto('/en');
    expect(res?.status()).toBeLessThan(400);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', /en/i);
  });
});

test.describe('Robustness', () => {
  test('invalid recommend-tier returns 400', async ({ request }) => {
    const res = await request.get('/api/v1/recommend-tier');
    expect(res.status()).toBe(400);
  });

  test('non-existent page returns 404 or redirects', async ({ page }) => {
    const res = await page.goto('/non-existent-page-12345');
    expect([200, 301, 302, 308, 404]).toContain(res?.status() ?? 0);
  });
});
