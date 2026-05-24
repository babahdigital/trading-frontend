# Next Session Tasks

> Updated 2026-05-24. HEAD: b2f70b6. Production clean, zero deferred.

---

## PRIORITY 1 — Customer Onboarding Testing

### T-1: Xendit Production Keys Switch
- Switch `XENDIT_SECRET_KEY` dan `XENDIT_PUBLIC_KEY` dari development ke production di VPS3 `.env`
- Set callback URL di Xendit dashboard untuk semua channels: `https://babahalgo.com/api/billing/webhook/xendit`
- Test end-to-end: register → checkout → pay (Card + QRIS + VA) → webhook → subscription activate → PDF invoice email
- Verify: invoice status DUE → PAID, subscription PENDING → ACTIVE

### T-2: Full Registration Flow Test
- Test customer journey: landing → /register?service=crypto → email verify → login → /portal → connect Binance → bot active
- Test forex: register → KYC submit → admin approve → forex bridge → MT5 linked
- Verify: 2FA setup + disable, password reset, forgot password flow

### T-3: Xendit Global Account (Optional)
- Email help@xendit.co request activate Global Account
- Set `XENDIT_GLOBAL_ACCOUNT_ENABLED=true` setelah aktif
- Enables: regional e-wallets for non-ID customers

---

## PRIORITY 2 — Content & Marketing

### T-4: Brevo Email Credentials
- Set `BREVO_API_KEY` dan `BREVO_SMTP_*` di VPS3 `.env`
- Test: welcome email, verification email, maintenance notification
- Verify: email templates render correctly (bilingual)

### T-5: Landing Page Content Audit
- Review semua text di halaman utama (/), /pricing, /solutions/*
- Pastikan pricing match antara landing ↔ checkout ↔ DB (PricingTier)
- Verify: semua CTA links work, no broken routes

### T-6: Google Search Console Setup
- Submit sitemap: https://babahalgo.com/sitemap.xml
- Verify: all pages indexed, no crawl errors
- Check: meta titles + descriptions render correctly in SERPs

---

## PRIORITY 3 — Monitoring & Ops

### T-7: BroadcastJob Migration
- Run `npx prisma migrate deploy` on VPS3 to create BroadcastJob table
- Test: admin broadcast email (deduplication should work)

### T-8: Monitoring Dashboard Review
- Check /admin/workers — all workers green?
- Check /admin/ai-calls — token spend reasonable?
- Check /admin/invoices — test invoices cleaned up?
- Check /admin/analytics — pageview tracking working?

### T-9: Backup Verification
- Verify R2 backup running (02:00/03:00 daily, Sun 04:00 full)
- Test restore: download latest backup from R2, import ke local DB

---

## PRIORITY 4 — Performance & Polish

### T-10: Lighthouse Audit
- Run Lighthouse on: /, /pricing, /research, /solutions/crypto
- Target: Performance 90+, Accessibility 95+, SEO 95+
- Fix any flagged issues

### T-11: Mobile Testing
- Test all pages on real mobile device (iPhone + Android)
- Focus: ticker, checkout flow, KYC form, chat widget
- Verify: responsive layout, touch targets, scroll behavior

### T-12: Load Testing (Optional)
- Simulate 50 concurrent users on checkout flow
- Verify: rate limiter works, no race conditions, DB handles load

---

## CONTEXT FOR AI SESSION

Saat mulai session baru, AI akan auto-load CLAUDE.md + MEMORY.md. Untuk start cepat:

```
"lanjutkan dari dev/NEXT_SESSION_TASKS.md — mulai dari T-1 Xendit production switch"
```

Atau jika ada issue spesifik:
```
"ada bug di [halaman], error: [message]"
```

### Key Files:
- CLAUDE.md — AI session guide (484 lines)
- README.md — developer onboarding (290 lines)
- docs/ — 10 reference docs (2,605 lines)
- dev/BACKEND_TASKS.md — all 9 tasks DONE
- dev/NEXT_SESSION_TASKS.md — this file
