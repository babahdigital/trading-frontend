## Ringkasan

<!-- Apa yang berubah dan kenapa. -->

## Area Terdampak

- [ ] Frontend pages / components (`src/app/`, `src/components/`)
- [ ] API routes (`src/app/api/`)
- [ ] Database schema (`prisma/schema.prisma`, migrations)
- [ ] Authentication / authorization (`middleware.ts`, JWT, license check)
- [ ] Capabilities / tier-gating (`src/lib/capabilities/`, `src/lib/auth/tier-product-guard.ts`)
- [ ] CMS / admin
- [ ] Public pages (landing, /pricing, /solutions/*)
- [ ] Customer portal (`/portal/*`)
- [ ] i18n (`src/i18n/`, `src/messages/`)
- [ ] Deployment / infra (Dockerfile, docker-compose, CI/CD)
- [ ] Cron jobs / background workers
- [ ] External integrations (Brevo, Midtrans, Xendit, Telegram, OpenRouter)

## Quality Gate

- [ ] `npx prisma generate` lulus
- [ ] `npx tsc --noEmit` lulus
- [ ] `npx next lint` lulus
- [ ] `npx next build` lulus
- [ ] Smoke test manual di browser (untuk perubahan UI)

## Risk & Rollback

**Risiko:**
<!-- Apa yang bisa break? Worst case scenario? -->

**Rollback strategy:**
<!-- 1 perintah / 1 commit revert? Atau perlu prosedur khusus (db migration revert dll)? -->

## Deployment Notes

- [ ] Tidak butuh env baru
- [ ] Butuh env baru (sebutkan): <!-- VPS3_NEW_VAR -->
- [ ] Butuh `prisma migrate deploy` di prod (otomatis via container startup)
- [ ] Butuh manual data migration / backfill
- [ ] Butuh restart service eksternal (cron, worker)

## Compliance Checklist (Zero-Custody)

- [ ] Tidak menambahkan flow Managed Account / PAMM (kami zero-custody)
- [ ] Halaman publik mencantumkan disclaimer risiko bila terkait trading signals
- [ ] Pricing tier konsisten dengan canonical (Signal $19/$79/$299, Crypto $49/$199/$499)
