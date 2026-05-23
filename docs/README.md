# BabahAlgo Frontend -- Developer Documentation

> Institutional-grade documentation for the `trading-apifrontend` codebase.
> Last updated: 2026-05-23

## Documents

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System architecture, route groups, middleware pipeline, data flow, external integrations, Docker deployment |
| [API Reference](./api-reference.md) | Complete endpoint catalog -- every route handler with method, path, auth, request/response shape |
| [Database Schema](./database.md) | All Prisma models grouped by domain -- purpose, key fields, relations, indexes |
| [Component Library](./components.md) | Every React component under `src/components/` -- file path, purpose, props, usage context |
| [AI Integration](./ai-integration.md) | OpenRouter setup, model catalog, per-feature mapping, content pipelines, cost tracking |
| [Deployment](./deployment.md) | CI/CD pipeline, Docker, environment variables, VPS3 operations, R2 backup, troubleshooting |
| [Auth & Security](./auth-and-security.md) | JWT flow, cookie security, RBAC, 2FA, rate limiting, webhook verification, XSS/CSRF |
| [Payment Integration](./payment.md) | Xendit inline checkout, webhook handling, invoice lifecycle, PDF generation, promo engine |
| [Internationalization](./i18n.md) | i18n source of truth, auto-translation, CMS sync, namespace map, locale detection |

## Quick Orientation

- **Framework**: Next.js 16 + React 19 + TypeScript 5.7 + Tailwind CSS 3.4
- **Database**: Prisma 5 + PostgreSQL 16 (native on VPS3, not Docker)
- **Domain**: babahalgo.com
- **Business model**: Zero-custody SaaS -- forex signal subscriptions + crypto bot access
- **Primary market**: Indonesia (default locale `id`, bilingual with `en`)

## Folder Map

```
src/
  app/                  # Next.js App Router (pages + API routes)
  components/           # React components (100+ files across 18 groups)
  lib/                  # Business logic modules (30+ feature modules)
  i18n/                 # Locale config + translation files (3100+ keys)
  types/                # Shared TypeScript definitions
  proxy.ts              # Edge middleware (auth, rate-limit, geo-IP)
  instrumentation.ts    # Server startup hook (cron workers)
prisma/
  schema.prisma         # 42+ models, enums, indexes
  migrations/           # Versioned SQL migrations
scripts/                # CLI tools (i18n sync, CMS translate, seeders)
docs/                   # This documentation folder
```

## Conventions

- All imports use `@/` path alias (mapped to `./src/`)
- Conventional commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`
- Quality gate before every commit: `prisma generate` + `tsc` + `lint` + `build`
- i18n source of truth: `id.json` (Indonesian) -- `en.json` auto-translated
- All monetary amounts stored as `Decimal` in PostgreSQL
- Phone numbers normalized to E.164 via `libphonenumber-js`
