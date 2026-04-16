# Chart Components

**Trading API Frontend — CV Babah Digital**

All chart components are located in `src/components/charts/`. They are client components (`'use client'`) and can be imported from `src/components/charts/index.ts`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Color Palette](#2-color-palette)
3. [EquityCurve](#3-equitycurve)
4. [PnlBarChart](#4-pnlbarchart)
5. [StrategyDonut](#5-strategydonut)
6. [WinRateBar](#6-winratebar)
7. [CumulativePnl](#7-cumulativepnl)
8. [ScannerHeatmap](#8-scannerheatmap)
9. [HourlyHeatmap](#9-hourlyheatmap)
10. [MonthlyCalendar](#10-monthlycalendar)
11. [Responsive Strategy](#11-responsive-strategy)
12. [Library Assignment Summary](#12-library-assignment-summary)

---

## 1. Overview

The platform uses two charting libraries, each chosen for its strengths:

| Library | Version | Use Case |
|---|---|---|
| **Lightweight Charts** (TradingView) | Latest | Financial time-series: equity curve — hardware-accelerated canvas |
| **Recharts** | Latest | Analytics charts: bar, donut, line — SVG-based, easy data binding |

Custom components (no external library):
- `ScannerHeatmap` — CSS grid with dynamic color intensity
- `HourlyHeatmap` — CSS grid with inline styles
- `MonthlyCalendar` — CSS grid with inline background colors

### Import

```typescript
import {
  EquityCurve,
  PnlBarChart,
  StrategyDonut,
  WinRateBar,
  CumulativePnl,
  ScannerHeatmap,
  HourlyHeatmap,
  MonthlyCalendar,
} from '@/components/charts';
```

---

## 2. Color Palette

All charts use a consistent dark-theme palette derived from Tailwind slate/green/red:

| Role | Color | Hex |
|---|---|---|
| Primary line / accent | Blue | `#3b82f6` (blue-500) |
| Positive PnL / profit | Green | `#22c55e` (green-500) |
| Negative PnL / loss | Red | `#ef4444` (red-500) |
| Warning / neutral | Yellow | `#eab308` (yellow-500) |
| Chart text / axis | Slate | `#94a3b8` (slate-400) |
| Grid lines | Transparent slate | `rgba(100,116,139,0.1)` |
| Tooltip background | Dark navy | `#1c2940` |
| Tooltip border | Transparent slate | `rgba(100,116,139,0.2)` |
| Background | Transparent | `transparent` |

Intensity-based colors (heatmaps) use CSS `rgba()` with opacity mapped to score magnitude:
- Green: `rgba(34,197,94, α)` where α ∈ [0.15, 0.75]
- Red: `rgba(239,68,68, α)` where α ∈ [0.15, 0.75]
- Neutral: `rgba(51,65,85,0.3)`

---

## 3. EquityCurve

**File:** `src/components/charts/equity-curve.tsx`
**Library:** Lightweight Charts (TradingView)
**Type:** Area chart with time-series axis

### Description

The primary financial performance chart. Renders account equity as a filled area over time. Supports multiple time period filters (7D, 30D, 90D, YTD) and fires a callback when the period changes. The chart is fully responsive and updates its width on window resize.

### Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `data` | `{ time: string; value: number }[]` | — | Yes | Array of time-value points |
| `height` | `number` | `400` | No | Chart height in pixels |
| `periods` | `string[]` | `['7D','30D','90D','YTD']` | No | Period filter button labels |
| `activePeriod` | `string` | `'30D'` | No | Initially selected period |
| `onPeriodChange` | `(period: string) => void` | — | No | Called when user selects a period |
| `showDrawdown` | `boolean` | — | No | Reserved — drawdown overlay (future) |
| `className` | `string` | `''` | No | Additional CSS classes |

### Data Format

```typescript
// Each item must have a date string (YYYY-MM-DD) and numeric equity value
const equityData: { time: string; value: number }[] = [
  { time: '2026-03-01', value: 14200.00 },
  { time: '2026-03-02', value: 14350.00 },
  { time: '2026-03-03', value: 14180.00 },
  { time: '2026-04-01', value: 15420.00 },
];
```

The `time` field must be in `YYYY-MM-DD` format as required by Lightweight Charts.

### Usage Example

```tsx
<EquityCurve
  data={equityData}
  height={320}
  periods={['7D', '30D', '90D']}
  activePeriod={equityPeriod}
  onPeriodChange={(period) => {
    setEquityPeriod(period);
    refetchEquityData(period);
  }}
  className="mt-4"
/>
```

### Visual Details

- Line color: `#3b82f6` (blue), line width: 2px
- Fill gradient: blue from 30% opacity at top to 2% at bottom
- Axes: transparent borders, slate-400 tick labels, Inter font
- Crosshair: slate-400 with 40% opacity
- Period buttons: active uses `bg-primary` / inactive uses `bg-secondary`

---

## 4. PnlBarChart

**File:** `src/components/charts/pnl-bar-chart.tsx`
**Library:** Recharts (`BarChart`, `Bar`, `Cell`)
**Type:** Vertical bar chart, color-coded by sign

### Description

Renders daily profit and loss as vertical bars. Each bar is independently colored green (profit) or red (loss) based on the sign of the `pnl` value. Used in the portal dashboard for 7-day PnL summary and in `/portal/performance` for monthly breakdowns.

### Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `data` | `{ date: string; pnl: number; trades?: number; winRate?: number }[]` | — | Yes | Daily PnL data |
| `height` | `number` | `360` | No | Chart height in pixels |
| `className` | `string` | `''` | No | Additional CSS classes |

### Data Format

```typescript
const pnlData = [
  { date: '10 Apr', pnl: 95.00, trades: 8, winRate: 75 },
  { date: '11 Apr', pnl: -42.00, trades: 6, winRate: 33 },
  { date: '12 Apr', pnl: 0, trades: 0 },
  { date: '13 Apr', pnl: 127.50, trades: 12, winRate: 66 },
];
```

`trades` and `winRate` fields are stored but currently used only in tooltips (reserved for enhanced tooltip display).

### Usage Example

```tsx
// 7-day mini bar on dashboard
<PnlBarChart data={weeklyPnl} height={160} />

// Full monthly bar on performance page
<PnlBarChart data={monthlyPnl} height={360} className="mt-4" />
```

### Visual Details

- Positive bars: `#22c55e` (green-500)
- Negative bars: `#ef4444` (red-500)
- Bar radius: `[4, 4, 0, 0]` — rounded top corners
- Y-axis formatter: `$${value}`
- Responsive: uses `ResponsiveContainer width="100%"`

---

## 5. StrategyDonut

**File:** `src/components/charts/strategy-donut.tsx`
**Library:** Recharts (`PieChart`, `Pie`, `Cell`, `Legend`)
**Type:** Donut chart (inner radius: 60, outer radius: 100)

### Description

Displays the distribution of trade volume or profit across trading strategies. Each strategy is represented as a donut segment with a custom color. Percentages are rendered as inline labels. An optional center text label can display a summary value (e.g., total trades or win rate).

### Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `data` | `{ name: string; value: number; color: string }[]` | — | Yes | Strategy data with individual colors |
| `centerLabel` | `string` | — | No | Text displayed in the center of the donut |
| `height` | `number` | `300` | No | Chart height in pixels |
| `className` | `string` | `''` | No | Additional CSS classes |

### Data Format

```typescript
// For client view — use generic strategy names
const strategyData = [
  { name: 'Strategi A', value: 34, color: '#3b82f6' },
  { name: 'Strategi B', value: 28, color: '#22c55e' },
  { name: 'Strategi C', value: 22, color: '#a855f7' },
  { name: 'Strategi D', value: 16, color: '#f59e0b' },
];

// For admin view — use real strategy names
const adminStrategyData = [
  { name: 'SMC', value: 34, color: '#3b82f6' },
  { name: 'Wyckoff', value: 28, color: '#22c55e' },
  { name: 'QM', value: 22, color: '#a855f7' },
  { name: 'AO', value: 16, color: '#f59e0b' },
];
```

### Usage Example

```tsx
<StrategyDonut
  data={strategyData}
  centerLabel="87"
  height={280}
  className="w-full"
/>
```

### Visual Details

- Labels: percentage rendered inside each segment (hidden if < 5%)
- Legend: below chart, slate-400 text, font size 12
- Padding angle: 2° between segments
- Center label: white, 18px bold, rendered as SVG `<text>` element

---

## 6. WinRateBar

**File:** `src/components/charts/win-rate-bar.tsx`
**Library:** Recharts (`BarChart` with `layout="vertical"`)
**Type:** Horizontal bar chart

### Description

Displays win rate per strategy or time period as horizontal bars. Bar color changes based on performance thresholds: green for ≥60%, yellow for ≥50%, red for <50%.

### Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `data` | `{ name: string; winRate: number }[]` | — | Yes | Name-winRate pairs |
| `height` | `number` | `300` | No | Chart height in pixels |
| `className` | `string` | `''` | No | Additional CSS classes |

### Data Format

```typescript
const winRateData = [
  { name: 'Strategi A', winRate: 67.6 },
  { name: 'Strategi B', winRate: 58.2 },
  { name: 'Strategi C', winRate: 48.5 },
  { name: 'Strategi D', winRate: 71.0 },
];
```

### Usage Example

```tsx
<WinRateBar
  data={winRateData}
  height={280}
  className="mt-4"
/>
```

### Color Thresholds

| Win Rate | Bar Color | Tailwind | Meaning |
|---|---|---|---|
| ≥ 60% | Green | `#22c55e` | Above target |
| 50%–59% | Yellow | `#eab308` | Borderline |
| < 50% | Red | `#ef4444` | Below break-even |

### Visual Details

- X-axis domain: `[0, 100]` with `%` formatter
- Y-axis: category axis with strategy names, 80px left margin
- Bar radius: `[0, 4, 4, 0]` — rounded right end

---

## 7. CumulativePnl

**File:** `src/components/charts/cumulative-pnl.tsx`
**Library:** Recharts (`AreaChart`, `Area`)
**Type:** Filled area chart on trade-number x-axis

### Description

Shows cumulative profit/loss progression across sequential trades (trade number on x-axis, cumulative PnL in USD on y-axis). Used in the performance page to visualize the equity growth trajectory from a trade-by-trade perspective.

### Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `data` | `{ trade: number; pnl: number }[]` | — | Yes | Cumulative PnL per trade index |
| `height` | `number` | `200` | No | Chart height in pixels |
| `className` | `string` | `''` | No | Additional CSS classes |

### Data Format

```typescript
// pnl is the running cumulative total, not per-trade PnL
const cumulativeData = [
  { trade: 1, pnl: 25.00 },
  { trade: 2, pnl: 13.00 },   // trade 2 lost $12
  { trade: 3, pnl: 57.00 },
  { trade: 87, pnl: 1240.50 },
];
```

### Usage Example

```tsx
<CumulativePnl
  data={cumulativePnlData}
  height={200}
  className="mt-4"
/>
```

### Visual Details

- Area fill: linear gradient, blue 30% at top → 0% at bottom
- Stroke: `#3b82f6`, width 2px
- X-axis label: "Trade #" positioned inside bottom
- SVG gradient ID: `cumPnlGrad`

---

## 8. ScannerHeatmap

**File:** `src/components/charts/scanner-heatmap.tsx`
**Library:** Custom CSS grid (no external library)
**Type:** Grid of colored tiles, one per currency pair

### Description

Displays the status of all scanned currency pairs as a colored grid. Color intensity corresponds to the pair's overall score. Supports two display modes: `admin` (shows raw numeric score + tooltip with sub-scores) and `client` (shows status label in Bahasa Indonesia: Aktif, Standby, Di luar jam).

### Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `pairs` | `PairData[]` | — | Yes | Array of pair data |
| `mode` | `'admin' \| 'client'` | `'admin'` | No | Controls score vs label display |
| `className` | `string` | `''` | No | Additional CSS classes |

### PairData Type

```typescript
interface PairData {
  pair: string;          // Symbol e.g. 'EURUSD'
  score: number;         // Overall score 0.00–1.00
  status: 'active' | 'standby' | 'off';
  breakdown?: {          // Only shown in admin mode tooltip
    smc: number;         // Smart Money Concepts score
    wyckoff: number;     // Wyckoff method score
    zone: number;        // Supply/demand zone score
    sr: number;          // Support/resistance score
    session: number;     // Trading session score
  };
}
```

### Usage Example

```tsx
// Admin view — shows raw scores
<ScannerHeatmap pairs={scannerData} mode="admin" />

// Client view — shows only status labels
<ScannerHeatmap pairs={scannerData} mode="client" />
```

### Score Color Thresholds

| Score | Background Color | Meaning |
|---|---|---|
| ≥ 0.80 | `bg-green-500/80` | High confluence |
| 0.60–0.79 | `bg-green-600/60` | Moderate confluence |
| 0.30–0.59 | `bg-yellow-500/50` | Low confluence |
| < 0.30 | `bg-slate-700/50` | Inactive |

### Status Dot Colors

| Status | Color |
|---|---|
| `active` | `bg-green-400` |
| `standby` | `bg-yellow-400` |
| `off` | `bg-slate-500` |

### Grid Layout

Responsive breakpoints: 2 cols (default) → 4 cols (sm) → 4 cols (lg) → 7 cols (xl)

### Admin Tooltip

On hover (admin mode only), shows sub-score breakdown if `breakdown` is provided:
```
SMC:     0.82
Wyckoff: 0.74
Zone:    0.90
S/R:     0.65
Session: 0.88
```

---

## 9. HourlyHeatmap

**File:** `src/components/charts/hourly-heatmap.tsx`
**Library:** Custom CSS grid with inline styles
**Type:** 7-row × 24-column heatmap

### Description

Visualizes PnL performance by day of week (rows: Mon–Sun) and hour of day (columns: 00–23). Each cell's color intensity represents the magnitude of PnL. Used in the performance page to identify optimal and suboptimal trading hours.

### Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `data` | `HeatmapCell[]` | — | Yes | Array of day/hour PnL cells |
| `className` | `string` | `''` | No | Additional CSS classes |

### HeatmapCell Type

```typescript
interface HeatmapCell {
  hour: number;   // 0–23
  day: number;    // 0=Mon, 1=Tue, ..., 6=Sun
  pnl: number;    // Positive or negative USD value
  trades: number; // Number of trades in this cell
}
```

### Data Format

```typescript
// Only non-zero cells are needed; zero cells are auto-filled
const heatmapData: HeatmapCell[] = [
  { day: 0, hour: 9, pnl: 45.00, trades: 3 },   // Monday 09:00
  { day: 0, hour: 10, pnl: -12.00, trades: 1 },  // Monday 10:00
  { day: 2, hour: 14, pnl: 88.50, trades: 5 },   // Wednesday 14:00
];
```

### Usage Example

```tsx
<HourlyHeatmap
  data={heatmapData}
  className="mt-4"
/>
```

### Visual Details

- Color intensity is normalized: `intensity = abs(pnl) / maxAbsPnl`
- Green: `rgba(34,197,94, 0.15 + intensity × 0.60)`
- Red: `rgba(239,68,68, 0.15 + intensity × 0.60)`
- Zero cells: `rgba(51,65,85,0.3)`
- Cell hover: `scale-125` CSS transform
- Hour labels: every 3rd hour shown (`00`, `03`, `06`...)
- Tooltip: fixed position (tracks mouse cursor), shows day/hour and PnL/trades
- Horizontal scrolling enabled for mobile (min-width: 600px)

---

## 10. MonthlyCalendar

**File:** `src/components/charts/monthly-calendar.tsx`
**Library:** Custom CSS grid
**Type:** Traditional calendar grid (7 columns)

### Description

Renders a monthly trading calendar where each day cell is color-coded by daily PnL. Green shading for profitable days, red for losing days, with opacity proportional to magnitude relative to the best/worst day of the month. Includes Bahasa Indonesia month names.

### Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `data` | `DayData[]` | — | Yes | Array of trading day data |
| `month` | `number` | — | Yes | Month number (1–12) |
| `year` | `number` | — | Yes | Four-digit year |
| `className` | `string` | `''` | No | Additional CSS classes |

### DayData Type

```typescript
interface DayData {
  date: string;    // Format: 'YYYY-MM-DD'
  pnl: number;     // Daily PnL in USD
  trades: number;  // Number of trades
  winRate: number; // Daily win rate (0–100)
}
```

### Data Format

```typescript
const calendarData: DayData[] = [
  { date: '2026-04-01', pnl: 95.00, trades: 8, winRate: 75 },
  { date: '2026-04-02', pnl: -42.00, trades: 6, winRate: 33 },
  { date: '2026-04-07', pnl: 127.50, trades: 12, winRate: 66 },
];
// Weekend days without data are rendered as empty neutral cells
```

### Usage Example

```tsx
<MonthlyCalendar
  data={calendarData}
  month={4}
  year={2026}
  className="w-full max-w-md"
/>
```

### Bahasa Indonesia Month Names

The component uses Indonesian month names for the calendar header:

```
1: Januari   2: Februari  3: Maret     4: April
5: Mei       6: Juni      7: Juli      8: Agustus
9: September 10: Oktober  11: November 12: Desember
```

### Visual Details

- Day labels: Mo, Tu, We, Th, Fr, Sa, Su
- Week starts on Monday
- Cell aspect ratio: `1:1` (square)
- Intensity: `alpha = 0.15 + (abs(pnl) / maxAbsPnl) × 0.60`
- Hover tooltip: shows PnL, trade count, and win rate
- Neutral cells (no data or zero PnL): `rgba(51,65,85,0.2)`

---

## 11. Responsive Strategy

| Component | Desktop | Tablet | Mobile |
|---|---|---|---|
| `EquityCurve` | Full width, 400px height | Full width, reduced height | Full width, 240px height |
| `PnlBarChart` | Full width, 360px height | Full width | Full width, 200px+ |
| `StrategyDonut` | 300px height | 300px | Scrollable if needed |
| `WinRateBar` | 300px height with 80px Y-axis | 300px | Horizontal scroll |
| `CumulativePnl` | Full width, 200px height | Same | Same |
| `ScannerHeatmap` | 7-column grid | 4-column grid | 2-column grid |
| `HourlyHeatmap` | 24 cols visible | Horizontal scroll | Horizontal scroll (min 600px) |
| `MonthlyCalendar` | 7-column, compact cells | 7-column | 7-column, small text |

All Recharts components use `<ResponsiveContainer width="100%" height={height}>` for automatic width adaptation.

`EquityCurve` uses a `window.addEventListener('resize', handleResize)` listener that calls `chart.applyOptions({ width: containerRef.clientWidth })`.

---

## 12. Library Assignment Summary

| Component | Library | Reason for Choice |
|---|---|---|
| `EquityCurve` | Lightweight Charts | WebGL canvas rendering; handles thousands of OHLCV data points; professional financial chart appearance |
| `PnlBarChart` | Recharts | Simple SVG bar chart; React-idiomatic with `data` prop; `Cell` component allows per-bar color |
| `StrategyDonut` | Recharts | `PieChart` + `Pie` supports donut (innerRadius) natively; built-in `Legend` component |
| `WinRateBar` | Recharts | `layout="vertical"` turns standard BarChart into horizontal bars; minimal code |
| `CumulativePnl` | Recharts | `AreaChart` supports gradient fills; simple sequential data |
| `ScannerHeatmap` | Custom CSS Grid | No external dependency; full control over color logic; tooltip with sub-score breakdown |
| `HourlyHeatmap` | Custom CSS Grid | 7×24 grid with inline styles; hover event for fixed tooltip |
| `MonthlyCalendar` | Custom CSS Grid | 7-column calendar grid; precise day alignment with empty leading cells |
