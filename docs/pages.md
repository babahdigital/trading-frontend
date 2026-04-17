# Pages Reference

**BabahAlgo — CV Babah Digital**

This document covers every page in the application: route, layout, components used, data sources, polling intervals, and differences in behavior between admin and client roles.

---

## Table of Contents

1. [Routing Architecture](#1-routing-architecture)
2. [Layouts](#2-layouts)
3. [Guest Pages](#3-guest-pages)
   - [Landing Page `/`](#31-landing-page-)
   - [Platform Pages](#32-platform-pages)
   - [Solutions Pages](#33-solutions-pages)
   - [Register Pages](#34-register-pages)
   - [Performance `/performance`](#35-performance-performance)
   - [Research `/research`](#36-research-research)
   - [Contact `/contact`](#37-contact-contact)
   - [About Pages](#38-about-pages)
   - [Pricing `/pricing`](#39-pricing-pricing)
   - [Legal Pages](#310-legal-pages)
4. [Auth Pages](#4-auth-pages)
   - [Login `/login`](#41-login-login)
5. [Admin Pages](#5-admin-pages)
   - [Dashboard `/admin`](#51-dashboard-admin)
   - [Licenses `/admin/licenses`](#52-licenses-adminlicenses)
   - [Users `/admin/users`](#53-users-adminusers)
   - [VPS Instances `/admin/vps`](#54-vps-instances-adminvps)
   - [Audit Log `/admin/audit`](#55-audit-log-adminaudit)
   - [Kill-Switch `/admin/kill-switch`](#56-kill-switch-adminkill-switch)
   - [Settings `/admin/settings`](#57-settings-adminsettings)
   - [CMS Pages](#58-cms-pages)
6. [Portal Pages (Client)](#6-portal-pages-client)
7. [Polling Intervals Summary](#7-polling-intervals-summary)
8. [Admin vs Client Behavior Matrix](#8-admin-vs-client-behavior-matrix)

---

## 1. Routing Architecture

The application uses **Next.js App Router** with route groups for layout isolation and **next-intl** for internationalization:

```
src/app/
├── layout.tsx                              # Root layout (html, body, fonts, globals.css)
│
├── [locale]/                               # i18n locale routing (id = default, en = /en/)
│   ├── page.tsx                            # / (Landing page → LandingClient)
│   └── (guest)/                            # Guest pages (public, no auth)
│       ├── platform/
│       │   ├── page.tsx                    # /platform
│       │   ├── technology/page.tsx         # /platform/technology
│       │   ├── risk-framework/page.tsx     # /platform/risk-framework
│       │   ├── execution/page.tsx          # /platform/execution
│       │   ├── instruments/page.tsx        # /platform/instruments
│       │   └── strategies/
│       │       ├── page.tsx                # /platform/strategies
│       │       └── [slug]/page.tsx         # /platform/strategies/smc, wyckoff, etc.
│       ├── solutions/
│       │   ├── signal/page.tsx             # /solutions/signal
│       │   ├── pamm/page.tsx               # /solutions/pamm
│       │   ├── license/page.tsx            # /solutions/license
│       │   └── institutional/page.tsx      # /solutions/institutional
│       ├── register/
│       │   ├── signal/page.tsx             # /register/signal
│       │   ├── pamm/page.tsx               # /register/pamm
│       │   └── institutional/page.tsx      # /register/institutional
│       ├── performance/page.tsx            # /performance
│       ├── research/page.tsx               # /research
│       ├── contact/page.tsx                # /contact
│       ├── about/
│       │   ├── page.tsx                    # /about
│       │   ├── team/page.tsx               # /about/team
│       │   └── governance/page.tsx         # /about/governance
│       ├── pricing/page.tsx                # /pricing
│       └── legal/
│           ├── terms/page.tsx              # /legal/terms
│           ├── privacy/page.tsx            # /legal/privacy
│           ├── risk-disclosure/page.tsx    # /legal/risk-disclosure
│           ├── regulatory/page.tsx         # /legal/regulatory
│           └── cookies/page.tsx            # /legal/cookies
│
├── (auth)/
│   └── login/page.tsx                      # /login
│
├── (admin)/
│   └── admin/
│       ├── layout.tsx                      # Admin sidebar + header
│       ├── page.tsx                        # /admin
│       ├── licenses/page.tsx               # /admin/licenses
│       ├── users/page.tsx                  # /admin/users
│       ├── vps/page.tsx                    # /admin/vps
│       ├── audit/page.tsx                  # /admin/audit
│       ├── kill-switch/page.tsx            # /admin/kill-switch
│       ├── settings/page.tsx               # /admin/settings
│       └── cms/
│           ├── landing/page.tsx            # /admin/cms/landing
│           ├── pricing/page.tsx            # /admin/cms/pricing
│           ├── faq/page.tsx                # /admin/cms/faq
│           ├── banners/page.tsx            # /admin/cms/banners
│           ├── popups/page.tsx             # /admin/cms/popups
│           ├── testimonials/page.tsx       # /admin/cms/testimonials
│           ├── seo/page.tsx                # /admin/cms/seo
│           ├── pages/page.tsx              # /admin/cms/pages
│           ├── articles/page.tsx           # /admin/cms/articles
│           └── inquiries/page.tsx          # /admin/cms/inquiries
│
└── (portal)/
    └── portal/
        ├── layout.tsx                      # Portal sidebar + header
        ├── page.tsx                        # /portal
        ├── positions/page.tsx              # /portal/positions
        ├── history/page.tsx                # /portal/history
        ├── performance/page.tsx            # /portal/performance
        ├── market/page.tsx                 # /portal/market
        ├── reports/page.tsx                # /portal/reports
        └── account/page.tsx                # /portal/account
```

### i18n Routing

- **Default locale** (`id`): No URL prefix — `/performance`, `/register/signal`
- **Alternate locale** (`en`): URL prefix — `/en/performance`, `/en/register/signal`
- **Geo-detection**: Cloudflare `CF-IPCountry` header detects non-Indonesian IPs and redirects to `/en` on first visit
- **Cookie**: `NEXT_LOCALE` persists locale preference for returning visitors

### Legacy Redirects (301 Permanent)

| Old Path | New Path |
|---|---|
| `/features` | `/platform` |
| `/faq` | `/contact` |
| `/terms` | `/legal/terms` |
| `/privacy` | `/legal/privacy` |
| `/risk-disclaimer` | `/legal/risk-disclosure` |

---

## 2. Layouts

### Root Layout (`src/app/layout.tsx`)

Applies to all pages. Sets HTML metadata, loads Fraunces + Inter Tight + JetBrains Mono fonts, applies `globals.css` with Tailwind and design tokens.

### Guest Layout (no explicit layout file)

All guest pages use `EnterpriseNav` + `EnterpriseFooter` directly within each page component. No shared guest layout wrapper — each page explicitly renders these components.

### Admin Layout (`src/app/(admin)/admin/layout.tsx`)

Wraps all admin pages. Contains:
- `AuthProvider` context wrapper
- `ResponsiveSidebar` with navigation:
  - **Main**: Dashboard, Licenses, VPS, Users, Audit, Kill-Switch, Settings
  - **Konten (CMS)**: Landing Page, Pricing, FAQ, Banners, Popups, Testimonials, SEO/Meta, Page Content, Articles, Inquiries
- Logout button
- Main content area with responsive padding

### Portal Layout (`src/app/(portal)/portal/layout.tsx`)

Wraps all portal pages. Contains sidebar with: Dashboard, Positions, History, Performance, Market, Reports, Account.

---

## 3. Guest Pages

All guest pages are public (no authentication required) and use `EnterpriseNav` + `EnterpriseFooter`.

### 3.1 Landing Page `/`

**File:** `src/app/[locale]/page.tsx` → `src/components/landing-client.tsx`
**Type:** Client Component

#### Sections

| Section | Content |
|---|---|
| Hero (100vh) | Headline (CMS overridable), subtitle, two CTAs (View Performance + Schedule Briefing), mini stats (YTD Return, Sharpe Ratio, Max Drawdown, Track Record Since) |
| Live Equity Curve | `EquityCurve` with period selector (7D/30D/90D), "Audited by MyFxBook" label |
| Platform (3 Pillars) | PillarCard components with custom SVG icons: Strategy Framework, Technology Stack, Risk Discipline |
| Solutions (4 Audience) | SolutionCard grid: Signal ($49/mo), PAMM (20-30%), License ($3K-7.5K), Institutional (Custom) |
| CTA + Disclosure | "Schedule a 30-minute briefing", link to Cal.com, risk disclosure text |

### 3.2 Platform Pages

| Route | Description |
|---|---|
| `/platform` | Platform overview — capabilities, differentiators |
| `/platform/technology` | Technology stack details + `ArchitectureDiagram` SVG component |
| `/platform/risk-framework` | 12-layer risk protection system breakdown |
| `/platform/execution` | ZeroMQ execution bridge, sub-2ms latency |
| `/platform/instruments` | Supported currency pairs and commodities |
| `/platform/strategies` | Strategy overview with links to individual strategies |
| `/platform/strategies/[slug]` | Individual strategy pages: `smc`, `wyckoff`, `astronacci`, `ai-momentum`, `oil-gas`, `smc-swing` |

### 3.3 Solutions Pages

| Route | Description |
|---|---|
| `/solutions/signal` | Signal service info — features, pricing, how it works |
| `/solutions/pamm` | PAMM account info — profit sharing model, tiers |
| `/solutions/license` | VPS license info — pricing, features, support levels |
| `/solutions/institutional` | Institutional engagement — managed accounts, API access, white-label |

### 3.4 Register Pages

Self-serve registration flows with multi-step wizards.

#### `/register/signal`
**File:** `src/app/[locale]/(guest)/register/signal/page.tsx`
**Type:** Client Component

3-step wizard:
1. **Account Information**: Name, Email, Password (wrapped in `<form>`)
2. **Select Tier**: Signal Basic ($49/mo) or Signal VIP ($149/mo)
3. **Confirmation**: Review details, submit to `POST /api/auth/register`

#### `/register/pamm`
**File:** `src/app/[locale]/(guest)/register/pamm/page.tsx`
**Type:** Client Component

3-step wizard:
1. **Account Information**: Name, Email, Password (wrapped in `<form>`)
2. **Broker Details**: Select tier (PAMM Basic 20% / PAMM Pro 30%), Broker Name, MT5 Account Number
3. **Confirmation**: Review details, submit to `POST /api/auth/register`

#### `/register/institutional`
**File:** `src/app/[locale]/(guest)/register/institutional/page.tsx`
**Type:** Server Component

Static page with:
- 4-step process display: Schedule Briefing → Discovery → Proposal → Onboarding
- 3 engagement model cards: Managed Account ($250K min), API Access (usage-based), White-Label (annual license)
- Cal.com embed for scheduling institutional briefings (`CalEmbed calLink="babahalgo/institutional"`)
- Link to contact page as alternative

### 3.5 Performance `/performance`

**File:** `src/app/[locale]/(guest)/performance/page.tsx`
**Type:** Client Component

#### Data Sources

| Data | Endpoint | Caching |
|---|---|---|
| Equity curve + KPIs | `GET /api/public/performance` | 4-hour server-side cache |

#### UI Layout

- **KPI Grid**: Total Return, Sharpe Ratio, Sortino Ratio, Profit Factor, Win Rate, Max Drawdown, Avg Hold Time, Recovery Factor
- **Equity Curve**: `EquityCurve` with period selector (7D/30D/90D/YTD)
- **Session Performance**: Hardcoded session data
- **Day-of-Week Analysis**: Hardcoded daily data

### 3.6 Research `/research`

**File:** `src/app/[locale]/(guest)/research/page.tsx`
**Type:** Server Component

Displays published articles from the Article database model. Links to individual article detail pages.

### 3.7 Contact `/contact`

**File:** `src/app/[locale]/(guest)/contact/page.tsx`
**Type:** Server Component (with client CalEmbed)

#### Sections

| Section | Content |
|---|---|
| Hero | "Talk to us." headline + description |
| Schedule a Briefing | `CalEmbed calLink="babahalgo/briefing"` — Cal.com inline scheduling widget (Google Meet integration) |
| Two-Column | Left: `ContactForm` (posts to `/api/public/inquiries`). Right: Direct channels (email, WhatsApp, office address) |

### 3.8 About Pages

| Route | Description |
|---|---|
| `/about` | Company overview |
| `/about/team` | Team members |
| `/about/governance` | Governance structure, audit reports |

### 3.9 Pricing `/pricing`

Pricing comparison page with tier cards.

### 3.10 Legal Pages

| Route | Description |
|---|---|
| `/legal/terms` | Terms of service |
| `/legal/privacy` | Privacy policy |
| `/legal/risk-disclosure` | Risk disclosure statement |
| `/legal/regulatory` | Regulatory information |
| `/legal/cookies` | Cookie policy |

---

## 4. Auth Pages

### 4.1 Login `/login`

**File:** `src/app/(auth)/login/page.tsx`
**Auth:** Public (redirects to `/portal` if already authenticated)
**Type:** Client Component

Two login modes via tab toggle:
- **Email + Password** (admin/standard login)
- **License Key + MT5 Account + Password** (VPS client login)

On success: stores tokens, redirects ADMIN → `/admin`, CLIENT → `/portal`.

---

## 5. Admin Pages

### 5.1–5.7 (Unchanged from v1)

Dashboard, Licenses, Users, VPS, Audit, Kill-Switch, Settings — see previous documentation for details.

### 5.8 CMS Pages

Admin CMS section for managing public-facing content.

| Route | Icon | Purpose | API Endpoint |
|---|---|---|---|
| `/admin/cms/landing` | FileText | Landing page sections | `/api/admin/cms/landing-sections` |
| `/admin/cms/pricing` | DollarSign | Pricing tiers | `/api/admin/cms/pricing` |
| `/admin/cms/faq` | HelpCircle | FAQ entries | `/api/admin/cms/faq` |
| `/admin/cms/banners` | Image | Banner management | `/api/admin/cms/banners` |
| `/admin/cms/popups` | MessageSquare | Popup management | `/api/admin/cms/popups` |
| `/admin/cms/testimonials` | Star | Client testimonials | `/api/admin/cms/testimonials` |
| `/admin/cms/seo` | Globe | SEO meta tags | `/api/admin/cms/seo` |
| `/admin/cms/pages` | Layers | CMS page content (bilingual) | `/api/admin/cms/pages` |
| `/admin/cms/articles` | BookOpen | Research articles with categories | `/api/admin/cms/articles` |
| `/admin/cms/inquiries` | Inbox | Contact form submissions | `/api/admin/cms/inquiries` |

#### CMS Pages Editor (`/admin/cms/pages`)
- Manage `PageContent` records: slug, title (ID + EN), subtitle, body (markdown), sections (JSON), visibility toggle
- CRUD via `/api/admin/cms/pages`

#### Articles Editor (`/admin/cms/articles`)
- Manage `Article` records: title, excerpt, body (markdown), category (enum), author, readTime, publish toggle
- Categories: RESEARCH, STRATEGY, EXECUTION, RISK, OPERATIONS, MARKET_ANALYSIS
- CRUD via `/api/admin/cms/articles`

---

## 6. Portal Pages (Client)

Dashboard, Positions, History, Performance, Market Scanner, Reports, Account — see previous documentation for details. All require CLIENT or ADMIN role with active license/subscription.

---

## 7. Polling Intervals Summary

| Page | Data | Interval | Endpoint |
|---|---|---|---|
| `/portal` | Bot status, positions | 5 seconds | `/api/client/status` |
| `/portal/positions` | Open positions | 3 seconds | `/api/client/positions` |
| `/portal/market` | Scanner status | 10 seconds | `/api/client/scanner` |
| `/performance` | Public equity data | On mount (4h cache) | `/api/public/performance` |
| All other pages | Historical/static | On mount only | Various |

---

## 8. Admin vs Client Behavior Matrix

| Feature | ADMIN Role | CLIENT Role | Guest (Unauthenticated) |
|---|---|---|---|
| Access to guest pages | Full | Full | Full |
| Access to `/register/*` | Full | Full | Full |
| Access to `/admin/*` | Full access | Redirect to `/login` | Redirect to `/login` |
| Access to `/portal/*` | Full access | Full (with active license) | Redirect to `/login` |
| CMS management | Full CRUD | Not accessible | Not accessible |
| Scanner heatmap scores | Raw numeric scores | Status labels only | N/A |
| Strategy names | Real names (SMC, Wyckoff) | Generic (Strategi A, B) | Public names on guest pages |
