# Next Session Tasks

> Updated 2026-05-27. HEAD: 55e0c9f. Centralization 100%, i18n consolidated, infrastructure modules shipped.

---

## COMPLETED THIS SESSION (2026-05-27)

- [x] CMS migration — 5 components now CMS-driven (strategies-section, tier-matrix, pricing, landing, performance)
- [x] Blog generator unstalled — 4 PENDING topics + 6 new topics (weeks 5-7) added
- [x] Popup Idul Adha — leadDays updated, promo ACTIVE (15% diskon crypto tiers)
- [x] Strategy slugs 404 — already working (308 redirect)
- [x] i18n consolidation — ~145 duplicate keys removed, unified in shared namespace
- [x] Compliance disclaimer library — disclaimers.ts + shared.disclaimer_* keys
- [x] Tier slug map consolidated — 4 billing routes → 1 source file
- [x] Dead Stripe handler removed — 200 lines deleted
- [x] 6 infrastructure modules shipped (use-crud, cta-links, rate-limiter, feature-flag-registry, json-ld-script, solution-page-shell)

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

### T-5: Google Search Console Setup
- Submit sitemap: https://babahalgo.com/sitemap.xml
- Verify: all pages indexed, no crawl errors
- Check: meta titles + descriptions render correctly in SERPs

---

## PRIORITY 3 — Infrastructure Migration

### T-6: Migrate Admin CMS Pages to useCrud Hook
- 23 admin CMS pages have identical boilerplate (fetch/save/delete/toast)
- `lib/admin/use-crud.ts` hook already created — migrate pages one by one
- Start with: faq, banners, testimonials, pricing (simplest CRUD patterns)
- Potential: ~2,400 lines of boilerplate reduced

### T-7: Migrate CTA Links to Registry
- `lib/navigation/cta-links.ts` registry already created
- Grep for `/register?service=` and `/checkout?tier=` across components
- Replace hardcoded strings with `CTA.registerCrypto()`, `CTA.checkoutTier()`, etc.
- 54+ files affected — do in batches per page category

### T-8: Apply Rate Limiter to API Routes
- `lib/api/rate-limiter.ts` with RATE_LIMITS registry already created
- Apply to: auth/login, auth/register, auth/forgot-password, billing/checkout, chat/lead, whatsapp/verify
- Replace per-route custom implementations with `checkRateLimit(ip, RATE_LIMITS.AUTH_LOGIN)`

### T-9: Apply SolutionPageShell to Remaining Pages
- `components/solutions/solution-page-shell.tsx` already applied to /solutions/crypto
- Migrate: /solutions/signal, /solutions/license, /solutions/institutional
- Removes Nav+Footer+JsonLd boilerplate from each page

---

## PRIORITY 4 — Monitoring & QA

### T-10: BroadcastJob Migration
- Run `npx prisma migrate deploy` on VPS3 to create BroadcastJob table
- Test: admin broadcast email (deduplication should work)

### T-11: Monitoring Dashboard Review
- Check /admin/workers — all workers green?
- Check /admin/ai-calls — token spend reasonable?
- Check /admin/invoices — test invoices cleaned up?
- Check /admin/analytics — pageview tracking working?

### T-12: Backup Verification
- Verify R2 backup running (02:00/03:00 daily, Sun 04:00 full)
- Test restore: download latest backup from R2, import ke local DB

### T-13: Lighthouse Audit
- Run Lighthouse on: /, /pricing, /research, /solutions/crypto
- Target: Performance 90+, Accessibility 95+, SEO 95+
- Fix any flagged issues

### T-14: Mobile Testing
- Test all pages on real mobile device (iPhone + Android)
- Focus: ticker, checkout flow, KYC form, chat widget
- Verify: responsive layout, touch targets, scroll behavior

---

## CONTEXT FOR AI SESSION

Saat mulai session baru, AI akan auto-load CLAUDE.md + MEMORY.md. Untuk start cepat:

```
"lanjutkan dari dev/NEXT_SESSION_TASKS.md — mulai dari T-1 Xendit production switch"
```

### Key Files:
- CLAUDE.md — AI session guide (500+ lines, includes Centralization Architecture)
- README.md — developer onboarding
- docs/ — 10 reference docs (updated 2026-05-27)
- dev/BACKEND_TASKS.md — all 9 tasks DONE
- dev/NEXT_SESSION_TASKS.md — this file

### New Infrastructure Modules (ready to use):
- `lib/admin/use-crud.ts` — generic CRUD hook for admin pages
- `lib/navigation/cta-links.ts` — CTA link registry
- `lib/api/rate-limiter.ts` — server-side rate limit registry
- `lib/feature-flag-registry.ts` — type-safe feature flags
- `lib/compliance/disclaimers.ts` — legal copy single source
- `lib/tiers/tier-slug-map.ts` — tier alias mapping
- `components/seo/json-ld-script.tsx` — JSON-LD injection
- `components/solutions/solution-page-shell.tsx` — solution page layout
