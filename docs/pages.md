# Pages Reference

**Trading API Frontend — CV Babah Digital**

This document covers every page in the application: route, layout, components used, data sources, polling intervals, and differences in behavior between admin and client roles.

---

## Table of Contents

1. [Routing Architecture](#1-routing-architecture)
2. [Layouts](#2-layouts)
3. [Guest Pages](#3-guest-pages)
   - [Landing Page `/`](#31-landing-page-)
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
6. [Portal Pages (Client)](#6-portal-pages-client)
   - [Dashboard `/portal`](#61-dashboard-portal)
   - [Positions `/portal/positions`](#62-positions-portalpositions)
   - [Trade History `/portal/history`](#63-trade-history-portalhistory)
   - [Performance `/portal/performance`](#64-performance-portalperformance)
   - [Market Scanner `/portal/market`](#65-market-scanner-portalmarket)
   - [Reports `/portal/reports`](#66-reports-portalreports)
   - [Account `/portal/account`](#67-account-portalaccount)
7. [Polling Intervals Summary](#7-polling-intervals-summary)
8. [Admin vs Client Behavior Matrix](#8-admin-vs-client-behavior-matrix)

---

## 1. Routing Architecture

The application uses **Next.js App Router** with route groups for layout isolation:

```
src/app/
├── page.tsx                          # / (Landing page)
├── layout.tsx                        # Root layout (html, body, globals.css)
│
├── (auth)/
│   └── login/
│       └── page.tsx                  # /login
│
├── (admin)/
│   └── admin/
│       ├── layout.tsx                # Admin sidebar + header
│       ├── page.tsx                  # /admin
│       ├── licenses/page.tsx         # /admin/licenses
│       ├── users/page.tsx            # /admin/users
│       ├── vps/page.tsx              # /admin/vps
│       ├── audit/page.tsx            # /admin/audit
│       ├── kill-switch/page.tsx      # /admin/kill-switch
│       └── settings/page.tsx         # /admin/settings
│
└── (portal)/
    └── portal/
        ├── layout.tsx                # Portal sidebar + header
        ├── page.tsx                  # /portal
        ├── positions/page.tsx        # /portal/positions
        ├── history/page.tsx          # /portal/history
        ├── performance/page.tsx      # /portal/performance
        ├── market/page.tsx           # /portal/market
        ├── reports/page.tsx          # /portal/reports
        └── account/page.tsx          # /portal/account
```

Route groups (`(auth)`, `(admin)`, `(portal)`) do not appear in the URL — they only exist to apply different layouts.

---

## 2. Layouts

### Root Layout (`src/app/layout.tsx`)

Applies to all pages. Sets HTML metadata, loads Inter font, applies `globals.css` with Tailwind base styles.

```
html
└── body (dark theme, Inter font, antialiased)
    └── {children}
```

### Admin Layout (`src/app/(admin)/admin/layout.tsx`)

Wraps all admin pages. Contains:
- Left sidebar with navigation links (Dashboard, Licenses, Users, VPS, Audit, Kill-Switch, Settings)
- Top header with user info and logout button
- Main content area with responsive padding

**Auth enforcement:** Middleware redirects non-ADMIN requests to `/login`.

### Portal Layout (`src/app/(portal)/portal/layout.tsx`)

Wraps all portal pages. Contains:
- Left sidebar with navigation links (Dashboard, Positions, History, Performance, Market, Reports, Account)
- Top header with bot status indicator, license badge, and logout
- Main content area

**Auth enforcement:** Middleware redirects unauthenticated or expired-license requests to `/login`.

---

## 3. Guest Pages

### 3.1 Landing Page `/`

**File:** `src/app/page.tsx`
**Auth:** Public (no authentication required)
**Type:** Server Component (SSR for SEO)

#### Purpose

Marketing/sales landing page for the platform. Targets both HNWI potential VPS clients ($3K–$7.5K) and retail subscribers ($49–$149/month).

#### Sections

| Section | Content |
|---|---|
| Hero | Headline, sub-headline, CTA buttons (Login / Learn More), animated equity chart |
| KPI Strip | Key stats: total clients, uptime, average monthly return, supported pairs |
| Live Equity Demo | `EquityCurve` with sample/demo equity data |
| Strategy Performance | `StrategyDonut` + `WinRateBar` with aggregated performance |
| Features | 3-column feature grid: Zero Downtime, Multi-Strategy, Risk Management |
| Risk Layers | Visual explanation of the 3-layer risk system |
| Pricing | 2-column pricing cards: VPS Installation vs PAMM/Signal subscription |
| Footer | Company info, CV Babah Digital, disclaimer |

#### Data Sources

- Demo chart data is **static/mock data** — no API calls on the landing page
- Real performance statistics (KPI strip) may optionally be fetched from a public `/api/stats` endpoint (future)

---

## 4. Auth Pages

### 4.1 Login `/login`

**File:** `src/app/(auth)/login/page.tsx`
**Auth:** Public (redirects to `/portal` if already authenticated)
**Type:** Client Component

#### Purpose

Single login page supporting both login modes. The user selects their mode via a tab toggle.

#### Login Modes

**Tab A — Standard (Email + Password):**
```
Email:    [________________________]
Password: [________________________]
          [  Login  ]
```

**Tab B — License Key Login:**
```
License Key:  [TRAD-XXXX-XXXX-XXXX-XXXX]
MT5 Account:  [________________________]
Password:     [________________________]
              [  Login  ]
```

#### Behavior

1. Submit credentials via `POST /api/auth/login`
2. On success:
   - Store `accessToken` and `user` object in `localStorage`
   - Store `refreshToken` in `sessionStorage` (or rely on `HttpOnly` cookie)
   - Redirect: ADMIN → `/admin`, CLIENT → `/portal`
3. On error: display error message below the form

#### Components Used

- `src/components/ui/input.tsx` (Shadcn/UI Input)
- `src/components/ui/button.tsx` (Shadcn/UI Button)
- `src/components/ui/card.tsx` (Shadcn/UI Card)

#### Rate Limiting Feedback

When rate limited (429), the form displays: "Too many login attempts. Please wait 1 minute."

---

## 5. Admin Pages

### 5.1 Dashboard `/admin`

**File:** `src/app/(admin)/admin/page.tsx`
**Auth:** ADMIN role required
**Type:** Client Component (charts require client-side rendering)

#### Data Sources

| Data | Endpoint | Polling |
|---|---|---|
| Aggregate stats | `GET /api/admin/dashboard` | On mount (no polling) |
| VPS health | Included in dashboard response | On mount |
| Recent audit logs | Included in dashboard response | On mount |
| Kill-switch events | Included in dashboard response | On mount |

#### UI Layout

**Row 1 — KPI Cards (4 columns):**
- Total Users
- Active Licenses
- VPS Instances Online
- Kill-Switch Events (last 7 days)

**Row 2 — Charts:**
- Left: License status distribution (`StrategyDonut` — ACTIVE/PENDING/EXPIRED/REVOKED)
- Right: Revenue by license type bar chart (`PnlBarChart`)

**Row 3 — VPS Status Table:**

| Column | Description |
|---|---|
| Name | VPS instance name |
| Status | ONLINE/OFFLINE/PROVISIONING badge |
| Active Licenses | Count |
| Last Health Check | Timestamp |
| Response Time | ms |

**Row 4 — Recent Audit Log:**
Last 10 audit entries in a table with action, user, IP, and timestamp.

---

### 5.2 Licenses `/admin/licenses`

**File:** `src/app/(admin)/admin/licenses/page.tsx`
**Auth:** ADMIN role required
**Type:** Client Component

#### Features

- **Table** of all licenses with columns: Key, Type, Status, User, Expires, VPS, Actions
- **Search/filter** by status, type, user ID
- **Pagination** (20 per page)
- **Create License Modal**: form with userId, type, vpsInstanceId (if VPS_INSTALLATION), startsAt, expiresAt
- **Actions per row**: Activate, Suspend, Revoke, Manual Kill-Switch

#### Data Sources

| Action | Endpoint |
|---|---|
| List licenses | `GET /api/admin/licenses?page=n&status=X` |
| Create license | `POST /api/admin/licenses` |
| Kill-switch | `POST /api/admin/kill-switch` |

#### Status Badges

| Status | Badge Color |
|---|---|
| `PENDING` | Gray |
| `ACTIVE` | Green |
| `EXPIRED` | Orange |
| `REVOKED` | Red |
| `SUSPENDED` | Yellow |

---

### 5.3 Users `/admin/users`

**File:** `src/app/(admin)/admin/users/page.tsx`
**Auth:** ADMIN role required
**Type:** Client Component

#### Features

- **Table** of all users: Email, Name, Role, MT5 Account, Licenses, Last Login
- **Create User Modal**: email, password, name, role, mt5Account
- **Search** by email or name
- **User Detail Drawer**: shows licenses, sessions, and audit log entries for selected user

#### Data Sources

| Action | Endpoint |
|---|---|
| List users | `GET /api/admin/users?page=n&role=X` |
| Create user | `POST /api/admin/users` |

---

### 5.4 VPS Instances `/admin/vps`

**File:** `src/app/(admin)/admin/vps/page.tsx`
**Auth:** ADMIN role required
**Type:** Client Component

#### Features

- **Table** of VPS instances: Name, Host, Status, Active Licenses, Last Health Check
- **Register New VPS Modal**: name, host, port, backendBaseUrl, adminToken (plaintext — encrypted before storage), SSH details, notes
- **Health History Chart**: per-VPS response time over last 24h (`CumulativePnl` repurposed)
- **Health Check Detail Modal**: last raw JSON response from `/health`

#### Data Sources

| Action | Endpoint |
|---|---|
| List VPS | `GET /api/admin/vps` |
| Register VPS | `POST /api/admin/vps` |

#### VPS Status Indicators

| Status | Color |
|---|---|
| `ONLINE` | Green dot |
| `OFFLINE` | Red dot |
| `PROVISIONING` | Yellow dot (pulse animation) |
| `SUSPENDED` | Gray dot |

---

### 5.5 Audit Log `/admin/audit`

**File:** `src/app/(admin)/admin/audit/page.tsx`
**Auth:** ADMIN role required
**Type:** Client Component

#### Features

- **Paginated table**: Action, User, License, IP Address, Timestamp, Metadata
- **Date range filter**: from/to date pickers
- **Action filter**: dropdown with common action values
- **Metadata expansion**: click a row to expand and view full JSON metadata

#### Data Sources

| Action | Endpoint |
|---|---|
| List logs | `GET /api/admin/audit?page=n&from=X&to=Y&action=Z` |

---

### 5.6 Kill-Switch `/admin/kill-switch`

**File:** `src/app/(admin)/admin/kill-switch/page.tsx`
**Auth:** ADMIN role required
**Type:** Client Component

#### Features

- **Events table**: License Key, Triggered By, Time, VPS Response, Success/Fail badge
- **Manual trigger form**: select license from dropdown, enter reason, confirm
- **Cron status indicator**: last run time, next scheduled run (60s interval)
- **Failure alert panel**: lists any failed kill-switch attempts with retry button

#### Data Sources

| Action | Endpoint |
|---|---|
| List events | `GET /api/admin/kill-switch?page=n` |
| Manual trigger | `POST /api/admin/kill-switch` |

---

### 5.7 Settings `/admin/settings`

**File:** `src/app/(admin)/admin/settings/page.tsx`
**Auth:** ADMIN role required
**Type:** Client Component

#### Features

- **Profile section**: update admin name, email, password
- **System info**: Next.js version, Node version, database connection status
- **License key format**: documentation and regeneration options
- **Cron worker status**: kill-switch and health-check worker last-run timestamps

---

## 6. Portal Pages (Client)

### 6.1 Dashboard `/portal`

**File:** `src/app/(portal)/portal/page.tsx`
**Auth:** CLIENT or ADMIN role required (with active licenseId/subscriptionId)
**Type:** Client Component

#### Data Sources and Polling

| Data | Endpoint | Polling Interval |
|---|---|---|
| Bot status + KPIs | `GET /api/client/status` | **5 seconds** |
| Equity history | `GET /api/client/equity?days=N` | On mount + period change |
| Weekly PnL (7 days) | `GET /api/client/reports` | On mount |

#### UI Layout

**Row 1 — Header:**
- Page title "Dashboard"
- Greeting: "Selamat datang, {userName}"
- License badge (ACTIVE/PENDING) + days remaining countdown (e.g., "30 hari tersisa")

**Row 2 — KPI Cards (4 columns):**

| Card | Data | Notes |
|---|---|---|
| Bot Status | `status.bot_status` | Color: green=active, red=error, yellow=other |
| Equity | `status.equity` | USD formatted, ▲/▼ % change |
| Today P&L | `status.today_pnl` | USD with sign, W/L count |
| Open Trades | `status.open_trades` | Count + floating PnL |

**Row 3 — Equity Curve:**
- `EquityCurve` component (height: 320px)
- Period selector: 7D, 30D, 90D
- Placeholder shown if no data connected

**Row 4 — Two Columns:**
- Left: Open positions list (symbol, BUY/SELL badge, PnL, duration in minutes)
  - Polling label: "Polling 3s" (note: actual polling is via the status endpoint at 5s)
- Right: Bot activity feed (pair name, runtime_status_label, seconds ago)
  - Sourced from `status.ai_state_by_pair`

**Row 5 — Daily PnL Mini Bar:**
- `PnlBarChart` (height: 160px)
- Last 7 entries from `reports.daily_pnl`

#### Error Handling

A red alert banner appears if any API call fails, showing the error message. The page continues to display the last successfully fetched data.

---

### 6.2 Positions `/portal/positions`

**File:** `src/app/(portal)/portal/positions/page.tsx`
**Auth:** CLIENT or ADMIN
**Type:** Client Component

#### Data Sources

| Data | Endpoint | Polling Interval |
|---|---|---|
| Open positions | `GET /api/client/positions` | **3 seconds** |

#### UI Layout

- **Summary bar**: total open positions, total floating PnL
- **Positions table**:

| Column | Description |
|---|---|
| Symbol | Currency pair (e.g., EURUSD) |
| Direction | BUY (green) or SELL (red) badge |
| Open Price | Entry price |
| Current Price | Live mark price |
| Duration | Time in position (Xm Ys format) |
| P&L | Floating PnL in USD, color-coded |

- Empty state: "Tidak ada posisi terbuka" (No open positions)
- Last updated timestamp shown in header

#### Behavior Differences (Admin vs Client)

Admins accessing `/portal` see the same filtered data as clients — the proxy filters apply to all roles using client endpoints.

---

### 6.3 Trade History `/portal/history`

**File:** `src/app/(portal)/portal/history/page.tsx`
**Auth:** CLIENT or ADMIN
**Type:** Client Component

#### Data Sources

| Data | Endpoint | Polling |
|---|---|---|
| Trade history | `GET /api/client/trades?from=X&to=Y&symbol=Z` | On mount + filter change |

#### UI Layout

**Filters bar:**
- Date range picker (from/to)
- Symbol selector dropdown
- Apply Filters button

**Summary cards:**
- Total Trades | Win Rate | Total P&L | Avg Duration

**Trades table:**

| Column | Description |
|---|---|
| Ticket | MT5 ticket number |
| Symbol | Currency pair |
| Direction | BUY/SELL |
| Open Price | Entry price |
| Close Price | Exit price |
| P&L | Realized PnL in USD |
| Duration | Trade duration formatted |
| Close Time | Timestamp |

- Color-coded P&L column (green/red)
- Pagination (20 trades per page)

---

### 6.4 Performance `/portal/performance`

**File:** `src/app/(portal)/portal/performance/page.tsx`
**Auth:** CLIENT or ADMIN
**Type:** Client Component

#### Data Sources

| Data | Endpoint | Polling |
|---|---|---|
| Performance summary | `GET /api/client/performance` | On mount |
| Trade history (for charts) | `GET /api/client/trades` | On mount |

#### UI Layout

**Row 1 — Period Selector:**
Tabs: 7D | 30D | 90D | All Time

**Row 2 — KPI Cards:**
- Profit Factor | Sharpe Ratio | Max Drawdown % | Total Trades

**Row 3 — Charts (two columns):**
- Left: `StrategyDonut` — trade count per strategy (client sees generic names)
- Right: `WinRateBar` — win rate per strategy

**Row 4 — Equity and PnL (two columns):**
- Left: `EquityCurve` — equity history
- Right: `PnlBarChart` — monthly PnL bar chart

**Row 5 — Cumulative and Hourly:**
- Left: `CumulativePnl` — sequential trade progression
- Right: `HourlyHeatmap` — performance by day/hour

---

### 6.5 Market Scanner `/portal/market`

**File:** `src/app/(portal)/portal/market/page.tsx`
**Auth:** CLIENT or ADMIN
**Type:** Client Component

#### Data Sources

| Data | Endpoint | Polling Interval |
|---|---|---|
| Scanner status | `GET /api/client/scanner` | **10 seconds** |

#### UI Layout

**Header:**
- Active trading session badge (e.g., "London Session")
- Last updated timestamp
- Active pairs count

**Scanner Grid:**
- `ScannerHeatmap` with `mode="client"` — shows AKTIF/STANDBY/Di luar jam labels
- 28 pairs displayed (Forex majors + minors)
- Color-coded cells based on `total_score`

**Session Indicator:**
Visual timeline showing London, New York, Tokyo, Sydney sessions with current time marker.

#### Behavior Differences

- **CLIENT**: `ScannerHeatmap mode="client"` — only status labels, no scores
- **ADMIN**: Would use `mode="admin"` to see raw scores and tooltips (if implemented in admin portal)

---

### 6.6 Reports `/portal/reports`

**File:** `src/app/(portal)/portal/reports/page.tsx`
**Auth:** CLIENT or ADMIN
**Type:** Client Component

#### Data Sources

| Data | Endpoint | Polling |
|---|---|---|
| Daily report + calendar | `GET /api/client/reports` | On mount |
| Monthly calendar | `GET /api/client/calendar?month=M&year=Y` | On month navigation |

#### UI Layout

**Row 1 — Today's Summary Cards:**
- Today's P&L | Today's Trades | Win Rate | Best Trade

**Row 2 — Monthly Calendar:**
- `MonthlyCalendar` with Indonesian month names
- Month navigation (previous/next)
- Hover tooltip shows: PnL, trade count, win rate

**Row 3 — Top Symbols Table:**
Best performing currency pairs this month: symbol, trades, win rate, total PnL

**Row 4 — Daily PnL Chart:**
- `PnlBarChart` showing last 30 days

---

### 6.7 Account `/portal/account`

**File:** `src/app/(portal)/portal/account/page.tsx`
**Auth:** CLIENT or ADMIN
**Type:** Client Component

#### Features

**Profile Section:**
- Display name (editable)
- Email (read-only)
- MT5 account number (read-only)
- Role badge

**License Information Panel:**

| Field | Description |
|---|---|
| License Key | Masked: `TRAD-XXXX-****-****-****` |
| License Type | VPS_INSTALLATION / PAMM_SUBSCRIBER / SIGNAL_SUBSCRIBER |
| Status | Active/Expired badge |
| Valid Until | Expiry date |
| Days Remaining | Countdown |

**Subscription Details** (for PAMM/Signal clients):
- Tier (PAMM_BASIC, PAMM_PRO, etc.)
- Monthly fee
- Profit share percentage

**Password Change Form:**
- Current password
- New password
- Confirm new password

**Session Management:**
- List of active sessions (IP address, user agent, created at)
- "Revoke all other sessions" button

---

## 7. Polling Intervals Summary

| Page | Data | Interval | Endpoint |
|---|---|---|---|
| `/portal` | Bot status, positions | 5 seconds | `/api/client/status` |
| `/portal/positions` | Open positions | 3 seconds | `/api/client/positions` |
| `/portal/market` | Scanner status | 10 seconds | `/api/client/scanner` |
| All other pages | Historical data | On mount only | Various |
| Admin dashboard | Stats | On mount only | `/api/admin/dashboard` |

All polling is implemented via `setInterval` inside `useEffect` with cleanup:

```typescript
useEffect(() => {
  let active = true;
  async function fetchData() {
    if (!active) return;
    const res = await fetch('/api/client/status', { headers: getAuthHeaders() });
    if (res.ok && active) setStatus(await res.json());
  }
  fetchData();
  const interval = setInterval(fetchData, 5000);
  return () => { active = false; clearInterval(interval); };
}, []);
```

The `active` flag prevents state updates after component unmount.

---

## 8. Admin vs Client Behavior Matrix

| Feature | ADMIN Role | CLIENT Role |
|---|---|---|
| Access to `/admin/*` | Full access | Redirect to `/login` |
| Access to `/portal/*` | Full access | Full access (with active license) |
| Access to `/api/admin/*` | Full access | 403 Forbidden |
| Access to `/api/client/*` | Allowed (same filters as CLIENT) | Allowed |
| Scanner heatmap scores | Raw numeric scores (mode=admin) | Status labels only (mode=client) |
| Strategy names | Real names (SMC, Wyckoff) | Generic (Strategi A, Strategi B) |
| Position lot sizes | Available (VPS direct access) | Stripped by filterPositions |
| Commission details | Available | Stripped |
| VPS admin token | Managed via admin panel | Never exposed |
| Kill-switch control | Manual trigger available | Not accessible |
| License management | Create, activate, revoke | View own license only |
| User management | Create, list, edit | View own profile only |
