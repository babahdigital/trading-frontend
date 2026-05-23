# AI Integration Guide

All AI features route through a single provider: OpenRouter. This gives centralized API key management, model selection, and cost tracking.

## OpenRouter Provider Setup

Configuration at `src/lib/ai/openrouter.ts`:

```
OpenRouter Client (singleton)
  baseURL: https://openrouter.ai/api/v1
  apiKey:  OPENROUTER_API_KEY (env var)
  headers: HTTP-Referer, X-Title
```

Built on `@ai-sdk/openai` (Vercel AI SDK 6). The client is created once and cached for the process lifetime. If `OPENROUTER_API_KEY` is not set, all AI features degrade gracefully -- `getOpenRouter()` returns `null` and callers skip AI processing.

---

## Model Catalog

| Constant | Model ID | Purpose | Cost Profile |
|----------|----------|---------|-------------|
| `DEFAULT_MODEL` | `google/gemini-3.1-flash-lite` | Chat, narration, translation, content generation | Cheap + fast |
| `REASONING_MODEL` | `google/gemini-3.5-flash` | Signal advisor, research, multi-step reasoning | Premium |
| Image model | Pollinations.ai (external URL) | Article hero images, promo images | Free tier |

Defined in `src/lib/ai/openrouter.ts`.

---

## Per-Feature Model Mapping

| Feature | Model | Module | Trigger |
|---------|-------|--------|---------|
| Chat widget | DEFAULT_MODEL | `src/app/api/chat/route.ts` | User message |
| Blog article generation | REASONING_MODEL | `src/lib/workers/blog-article-generator.ts` | Cron (12h) |
| Daily research | REASONING_MODEL | `src/lib/workers/daily-research.ts` | Cron (24h) |
| Pair brief narrative | DEFAULT_MODEL | `src/lib/ai/pair-brief-generator.ts` | Cron (4h) |
| Pair brief translation | DEFAULT_MODEL | `src/lib/ai/pair-brief-generator.ts` | After narrative gen |
| CMS i18n auto-sync | DEFAULT_MODEL | `src/lib/workers/cms-i18n-sync.ts` | Cron (5min) |
| i18n string translation | DEFAULT_MODEL | `scripts/translate-i18n.ts` | CLI manual |
| Article body enhancement | DEFAULT_MODEL | `src/lib/ai/content.ts` | Cron pipeline |
| SEO meta backfill | DEFAULT_MODEL | `src/app/api/cron/backfill-seo-meta/` | Cron manual |
| Promo strategist | REASONING_MODEL | `src/app/api/cron/promo-strategist/` | Cron daily |
| Image generation | Pollinations / Gemini Flash Image | `src/lib/ai/promo-image-generator.ts` | Promo + article pipelines |

---

## Blog Article Generation Pipeline

```
BlogTopic (DB catalog)
  |  slug, promptTemplate, dataSources, keywords, category
  v
Worker: runBlogArticleGenerator (12h interval)
  |
  v
1. Query BlogTopic where status=PENDING, ordered by priority
  |
  v
2. Fetch data sources (VPS1 signals, market data)
  |
  v
3. Build prompt from template + data
  |
  v
4. Call REASONING_MODEL via OpenRouter
  |
  v
5. Generate article (title, body, excerpt in Indonesian)
  |
  v
6. Auto-translate to English via DEFAULT_MODEL
  |
  v
7. Generate SEO metadata (metaTitle, metaDescription, keywords)
  |
  v
8. Create Article record, link to BlogTopic
  |
  v
9. Auto-publish if topic.autoPublish = true
  |
  v
10. Log to AiCallLog + WorkerRun
```

Topics are DB-backed (`BlogTopic` model) -- admin can add new topics including crypto via `assetClass=CRYPTO` without code changes. Day-of-week rotation: Mon=recap, Tue=AI lesson, Wed=case study, Thu=correlation, Fri=risk, Sat=strategy, Sun=preview.

---

## Daily Research Pipeline

`src/lib/workers/daily-research.ts` -- runs every 24h.

- Day-of-week rotation determines research type
- Slug pattern `daily-{YYYY-MM-DD}-{type}` ensures idempotency
- Auto-enabled when `OPENROUTER_API_KEY` is set
- Disable with `ENABLE_DAILY_RESEARCH="0"`

---

## Pair Brief Generation

`src/lib/workers/pair-brief.ts` + `src/lib/ai/pair-brief-generator.ts`

```
VPS1 (forex backend)
  |  Structured data: S/R levels, SND zones, confluence, patterns
  v
Pair Brief Worker (4h interval)
  |
  v
1. Fetch pair data from VPS1 (ground truth -- never AI-generated)
  |
  v
2. Build prompt with structured data as constraints
  |
  v
3. Generate narrative via DEFAULT_MODEL
  |
  v
4. Validate narrative against structured data
     (src/lib/ai/pair-brief-validator.ts)
  |
  v
5. Translate narrative to English
  |
  v
6. Create PairBrief record
  |
  v
7. Notify subscribers (Telegram, email)
     (src/lib/notifier/pair-brief-notify.ts)
```

Validation ensures the AI narrative does not contradict the ground truth structured data. If validation fails, the brief is flagged for `MANUAL_REVIEW`.

---

## Chat System

`src/app/api/chat/route.ts` -- streaming AI chat with modular skills.

### Architecture

```
User Message
  |
  v
Chat Lead Gate (ChatLeadForm)
  |  Requires name + email before first message
  v
Skill Router
  |  Detects context: forex / crypto / global
  v
Skill Module (src/lib/chat/*)
  |  Injects domain-specific system prompt + context
  v
OpenRouter (DEFAULT_MODEL, streaming)
  |
  v
Streaming Response (AI SDK)
```

### Skill Types

| Skill | Context | Knowledge |
|-------|---------|-----------|
| Forex | Signal/strategy questions | Trading pairs, strategies, risk |
| Crypto | Bot/exchange questions | Binance, API keys, positions |
| Global | General questions | Platform, pricing, company |

### State Machine

- Footer 1-click opens chat
- X button = clear conversation + email summary to user
- Minus button = minimize (persists state)
- Controlled via `ChatWidgetMount` component

### Auth Context

`src/lib/chat/auth-context.ts` -- builds chat context from user session:
- Authenticated user: includes tier, subscription status, trade history
- Guest: generic platform context

---

## Image Generation

`src/lib/ai/promo-image-generator.ts`

Two providers with fallback chain:

1. **Gemini Flash Image** (via OpenRouter) -- primary, higher quality
2. **Pollinations.ai** -- fallback, free tier, URL-based API

Used for:
- Article hero images (`/api/cron/refresh-article-images`)
- Promotion hero images (AI strategist pipeline)
- Bilingual image variants (Indonesian + English versions)

---

## CMS i18n Auto-Sync

`src/lib/workers/cms-i18n-sync.ts` -- runs every 5 minutes.

```
CMS Models with bilingual columns
  (Faq, PricingTier, LandingSection, Article, PageMeta)
  |
  v
Detect stale rows:
  WHERE updatedAt > en_synced_at OR en_synced_at IS NULL
  |
  v
Translate Indonesian -> English via DEFAULT_MODEL
  |
  v
Update *_en columns + set en_synced_at = now()
```

Zero-touch: admin only writes Indonesian content. English columns auto-fill within 5 minutes. Re-edits to Indonesian automatically invalidate the stale English translation.

---

## SEO Meta Generation

`/api/cron/backfill-seo-meta` -- generates SEO metadata for routes missing it.

- Generates `metaTitle` (50-60 chars), `metaDescription` (150-160 chars)
- Bilingual (Indonesian + English)
- Stored in `PageMeta` model
- Includes structured data (JSON-LD) generation

---

## Promo Strategist

`/api/cron/promo-strategist` -- autonomous promo decision engine.

```
Daily cron
  |
  v
1. Snapshot revenue (RevenueSnapshot: MRR, active subs, churn)
  |
  v
2. Check upcoming CalendarEvents (next 14 days)
  |
  v
3. LLM strategist decides:
     - greeting-only (no discount)
     - greeting + discount
     - flash-sale
     - no-action
  |
  v
4. Create Promotion record (DRAFT or auto-publish if confidence >= 80)
  |
  v
5. Generate promo image (bilingual)
  |
  v
6. Admin review (if not auto-published)
```

---

## Cost Tracking

All AI calls logged to `AiCallLog` model:

| Field | Description |
|-------|-------------|
| purpose | Feature identifier (e.g. `pair_brief_narrative`, `blog_article`) |
| model | Model used |
| inputTokens | Prompt tokens consumed |
| outputTokens | Completion tokens generated |
| latencyMs | Request duration |
| success | Whether the call succeeded |
| errorMessage | Error details if failed |
| metadata | Additional context (Json) |

Query `AiCallLog` to analyze:
- Cost per feature
- Token usage trends
- Error rates by model
- Latency percentiles
