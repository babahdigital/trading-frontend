# Frontend Total Refactor — Editorial Quant Journal (Dark-first)

**Date:** 2026-06-03
**Owner:** Abdullah / Babah Digital
**Status:** Approved direction (visual + theme), executing foundation-first
**Scope:** Public/guest surfaces (landing, pricing, solutions, platform, performance, research, about, contact, demo, legal) + centralized design system. Portal/admin polish follows later.

---

## 1. Decision (locked)

- **Visual identity:** *Editorial Quant Journal* — Financial Times / The Economist research-publication feel fused with a quant data terminal. Display typography with character, hairline rules, generous whitespace, data-as-hero, editorial grid. Deliberately NOT a generic SaaS template ("pasaran").
- **Default theme:** **Dark-first** (brand hero color is midnight navy `#0B1220`). Light mode retained via toggle, polished as secondary.
- **Non-negotiable principle:** **Centralization** — one source of truth for color/type/spacing/rhythm (CSS variables + Tailwind theme + shared React primitives). Edit once → changes everywhere. No scattered hex, no per-page reinvented shells. (Owner directive 2026-06-03.)

## 2. Current-state truth (from audit)

- Design tokens already **~82% centralized** in `globals.css` (60+ semantic vars) + `tailwind.config.ts`. Foundation is strong — **evolve, don't rebuild**.
- Real problems that read as "pasaran" + hard to maintain:
  - **Shell duplication:** Nav+Footer inlined by hand in ~32 guest pages; `SolutionPageShell` used by only 3; route-group layout is a pass-through.
  - **`.section-header` CSS helper: 0 adoption** → inconsistent vertical rhythm.
  - **`TierCard` rebuilt 4×** (pricing, crypto grid, tier-matrix, landing) — no shared primitive.
  - **`landing-client.tsx` = 1196-line monolith** with 8 inline sections.
  - Generic visual language (no distinctive type/editorial signature).
- Debug/dummy: **clean** (console gated by NODE_ENV, mock badged, no lorem/keys/localhost leaks).
- Copy: i18n-driven, real metrics (master tenant, self-hiding) — **production-ready**, but has factual drift vs backend (see §6).
- **Image bug (FIXED):** promo generator only read one Gemini response shape → silent Pollinations fallback (the "free-looking" Hari Pancasila banner). Centralized the parser in `gemini-image-parse.ts`, shared by both generators. Added a no-image log.

## 3. Design-token evolution (foundation, Phase A)

Evolve `globals.css` + `tailwind.config.ts` (single source) — additive, back-compatible:

- **Typography (the signature):** introduce an editorial **display** face (serif or high-character grotesk) for headings via `next/font`, mapped to `--font-display`; keep a clean sans for body (`--font-body`) and mono for data (`--font-mono`). Refine the `t-display-*` scale for editorial contrast (larger, tighter, optical).
- **Color (dark-first):** deepen the dark base canvas, refine amber accent for AA contrast on dark, add **hairline** border tokens (`--hairline`, very low-alpha), editorial **rule** token, and the missing **form-state** tokens (`--form-error/success/focus`) the audit flagged.
- **Editorial details:** kicker/eyebrow tokens, "Vol." label style, rule/divider utilities, refined elevation (flatter, ink-on-paper not glossy cards).
- **Consolidate remaining scatter** into named modules: `lib/design/payment-brand-colors.ts` (checkout brands), `lib/charts/chart-theme.ts` (OHLC colors derived from tokens for Lightweight Charts).

## 4. Shell + primitive centralization (foundation, Phase B)

- **`GuestPageShell`** (generalize `SolutionPageShell`): renders skip-link + `min-h-screen` wrapper + `EnterpriseNav` + `<main>` + optional sticky CTA + `EnterpriseFooter` + JSON-LD. Render **once** in the `(guest)` route-group layout; delete ~32 inline copies.
- **`SectionHeader`** component (eyebrow/kicker + title + lead) — enforce editorial rhythm everywhere.
- **`Section`/`Container`** primitive wrapping the existing `.layout-container` + `.section-padding` tokens (one vertical-rhythm source).
- **`TierCard`** shared primitive consumed by pricing, crypto tier-matrix, landing.
- Centralize nav/footer link maps into `lib/navigation/cta-links.ts` (currently hardcoded inline).

## 5. Per-page application (Phase C — after foundation lands + checkpoint)

Order (each unit: patch → tsc+lint+build → verify): **landing → pricing → solutions(hub+4) → platform(hub+6) → performance(hub+2) → research → about(3) → contact → demo → legal → status/changelog**. Decompose `landing-client.tsx` into per-section components along the way.

## 6. Copy-integrity corrections (Phase D — tracked, separate workstream)

Replace drifted/generic copy with backend-true facts (numbers from live API, never hardcoded). Key corrections:

- **Crypto is spot + futures**, not "futures-only" (free_demo/micro spot; starter+ both). Fix copy + CLAUDE.md note.
- **Crypto pricing = 6 tiers** (free_demo $0 / micro $4.99 / starter $9 / active $19 / pro $49 / hnwi $199) with real leverage (2/2/3/7/12/20x), slots (1/1/2/3/5/7), risk % (0.5–2.0), notional cap (30–75%). Source = `profiles_tier.py` TIER_CATALOG (no public endpoint — mirror server-side).
- **Crypto strategies (6):** microstructure_momentum, vwap_oi_reversion, mean_reversion_bb, smart_money_confluence, scalping_momentum_v2, funding_rate_arb. `qm_perfect` removed.
- **Forex AI purge:** `ai_advisor=false` — remove any "AI advisor" trading panel; reframe AI as advisory/content-only (chat, research) everywhere.
- **Honesty framing:** forex master-tenant = REAL broker equity (live); crypto = PAPER/shadow, go-live gated → label crypto track-record as paper.
- **Forex `net_pnl_quote` is GROSS of commission/swap** — never label "net of fees."
- **Drawdown %** must be `drawdown_quote / period-start balance`, not the API's `drawdown_pct` (which is vs cumulative P&L).
- Do **NOT** surface profit-share (dropped by compliance) despite tier catalog fields.
- **New honest content to add** (real differentiators): deterministic no-AI core, zero-custody mechanism (own broker/Binance key, Vault), SL anchored to S&D zones, 10% absolute ceiling, kill-switch, 8-layer exit, 13-guard pipeline, evidence-first strategy promotion (30d IS + 14d OOS + soak), freshness gates. Map per `useForPage` in mining report.
- **New API fields to consume** for real metrics: forex `/positions/stats` (avg_r_multiple, avg_hold_seconds), `/me/market-state`, `/me/kill-switch`; crypto `/analytics/performance`, `/health/*` (honest /status).

## 7. Out of scope / escalations

- **Promo image durability:** files written to `public/uploads/` live in the container writable layer → vanish on redeploy. Needs a mounted volume or R2 push (infra decision). Not the visual bug.
- **Profit-share** publish: legal sign-off required (currently dropped).
- Backend changes: none — backend is READ-ONLY source of truth. Missing fields → escalate.

## 8. Quality gate (every unit)

`npx prisma generate` (if schema) → `npx tsc --noEmit` → `npx eslint .` → `npm run build`. No unit ships red. CI/CD only at end of session (batched split commits → one push).
