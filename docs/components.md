# Component Library

All React components under `src/components/`. Organized by domain.

---

## Layout Components

Core layout elements used across the application.

| Component | File | Purpose |
|-----------|------|---------|
| EnterpriseNav | `layout/enterprise-nav.tsx` | Main navigation bar with mega menu, locale switcher, auth state |
| EnterpriseFooter | `layout/enterprise-footer.tsx` | Site footer with links, newsletter, social |
| ResponsiveSidebar | `layout/responsive-sidebar.tsx` | Admin/portal sidebar navigation |
| BrandLogo | `layout/brand-logo.tsx` | Logo component with dark/light variants |
| NewsletterForm | `layout/newsletter-form.tsx` | Email newsletter subscription form |
| RegionPreferences | `layout/region-preferences.tsx` | Country/currency/language selector |
| TickerBar | `layout/ticker-bar.tsx` | Live price ticker (28 symbols: commodities, crypto, forex, indices) |

---

## UI Primitives

Shared base components built on Radix UI primitives. Used across all pages.

| Component | File | Purpose |
|-----------|------|---------|
| Button | `ui/button.tsx` | Primary button with variants (default, destructive, outline, ghost, link) |
| Card | `ui/card.tsx` | Content card container |
| Dialog | `ui/dialog.tsx` | Modal dialog (Radix) |
| ConfirmDialog | `ui/confirm-dialog.tsx` | Confirmation dialog with confirm/cancel actions |
| Input | `ui/input.tsx` | Text input field |
| Textarea | `ui/textarea.tsx` | Multi-line text input |
| Label | `ui/label.tsx` | Form label (Radix) |
| Badge | `ui/badge.tsx` | Status/category badge |
| Tabs | `ui/tabs.tsx` | Tab navigation (Radix) |
| Table | `ui/table.tsx` | Data table with header/body/row structure |
| Switch | `ui/switch.tsx` | Toggle switch (Radix) |
| Toast | `ui/toast.tsx` | Toast notification system |
| Skeleton | `ui/skeleton.tsx` | Loading skeleton placeholder |
| Pagination | `ui/pagination.tsx` | Page navigation controls |
| Icon | `ui/icon.tsx` | Unified icon wrapper (Lucide) |
| SmoothAccordion | `ui/smooth-accordion.tsx` | Animated accordion with smooth transitions |
| AnimatedSection | `ui/animated-section.tsx` | Framer Motion scroll-reveal wrapper |
| StaggerContainer | `ui/stagger-container.tsx` | Staggered animation container |
| CalEmbed | `ui/cal-embed.tsx` | Cal.com scheduling embed |
| LanguageSwitcher | `ui/language-switcher.tsx` | Locale toggle (id/en) for guest pages |
| AuthLocaleSwitcher | `ui/auth-locale-switcher.tsx` | Locale toggle for auth pages |
| ThemeToggle | `ui/theme-toggle.tsx` | Dark/light mode toggle |
| AccountTypeBadge | `ui/account-type-badge.tsx` | User role/type badge |

---

## Checkout Components

Xendit inline payment flow.

| Component | File | Purpose |
|-----------|------|---------|
| InlineCheckout | `checkout/inline-checkout.tsx` | Main checkout orchestrator (payment method tabs) |
| CheckoutButton | `checkout/checkout-button.tsx` | Payment submit button with loading state |
| CardForm | `checkout/card-form.tsx` | Credit/debit card form (Xendit tokenization) |
| QrisDisplay | `checkout/qris-display.tsx` | QRIS QR code display with countdown |
| VaDisplay | `checkout/va-display.tsx` | Virtual Account number display |
| EwalletDisplay | `checkout/ewallet-display.tsx` | E-wallet redirect/deeplink display |

Used on: `/checkout`, `/portal/billing/upgrade`

---

## Chat Components

AI chat widget with state machine.

| Component | File | Purpose |
|-----------|------|---------|
| ChatOpenButton | `chat/chat-open-button.tsx` | Floating chat open button |
| ChatLeadForm | `chat/chat-lead-form.tsx` | Pre-chat lead capture gate (name + email) |

Additional chat components exist in the `ChatWidgetMount` system that manages open/minimize/close states. Footer 1-click open, X clears + sends email summary, minus minimizes.

Used on: All guest pages (floating widget)

---

## Admin Components

Admin console shared components.

| Component | File | Purpose |
|-----------|------|---------|
| PageHeader | `admin/page-header.tsx` | Admin page title + breadcrumb + actions |
| StatCard | `admin/stat-card.tsx` | Dashboard metric card |
| FilterBar | `admin/filter-bar.tsx` | Table filter controls (search, status, date) |
| EmptyState | `admin/empty-state.tsx` | Empty data state illustration |
| TenantActions | `admin/tenant-actions.tsx` | Customer action buttons (suspend, activate) |
| TenantAuditTimeline | `admin/tenant-audit-timeline.tsx` | Audit event timeline for customer detail |
| ImageUploadField | `admin/image-upload-field.tsx` | Image upload with preview |

**Generic CRUD Hook** (`lib/admin/use-crud.ts`): Shared state management for all CMS pages.
Provides: `items`, `editing`, `loading`, `saving`, `fetchItems()`, `handleSave()`, `handleDelete()`,
`startCreate()`, `startEdit()`, `cancelEdit()`, `updateField()`. Usage:
```ts
const crud = useCrud<FaqItem>({ endpoint: '/api/admin/cms/faq' });
```

Used on: All `/admin/*` pages

---

## SEO Components

| Component | File | Purpose |
|-----------|------|---------|
| JsonLdScript | `seo/json-ld-script.tsx` | Reusable JSON-LD structured data injection |
| MultiJsonLd | `seo/json-ld-script.tsx` | Multiple JSON-LD schemas in one call |

---

## Solution Page Components

| Component | File | Purpose |
|-----------|------|---------|
| SolutionPageShell | `solutions/solution-page-shell.tsx` | Shared wrapper: Nav + Footer + JSON-LD + sticky bar |

Used on: `/solutions/crypto`, applicable to all solution pages

---

## Portal Components

Client portal components.

| Component | File | Purpose |
|-----------|------|---------|
| UpgradePanel | `portal/billing/upgrade-panel.tsx` | Subscription upgrade UI |
| KillSwitchBanner | `portal/kill-switch-banner.tsx` | Kill-switch warning banner |
| DiscoveryBanner | `portal/discovery-banner.tsx` | Feature discovery prompt |
| OnboardingChecklist | `portal/onboarding-checklist.tsx` | New user setup checklist |
| VerifyEmailBanner | `portal/verify-email-banner.tsx` | Email verification prompt |
| SubscriptionExpiryBanner | `portal/subscription-expiry-banner.tsx` | Subscription renewal reminder |
| KycAdvisoryBanner | `portal/kyc-advisory-banner.tsx` | KYC submission prompt |
| WhatsappSection | `portal/whatsapp-section.tsx` | WhatsApp verification + preferences |
| CryptoNotificationsSection | `portal/crypto-notifications-section.tsx` | Crypto notification settings |
| NotificationChannelPrefs | `portal/notification-channel-prefs.tsx` | Notification channel toggles |
| NotificationBellCount | `portal/notification-bell-count.tsx` | Bell icon with unread count |
| NotificationDispatcher | `portal/notification-dispatcher.tsx` | Client-side notification handler |
| TradingToggle | `portal/trading-toggle.tsx` | Trading engine on/off switch |
| CloseAccountSection | `portal/close-account-section.tsx` | Account closure form |

Used on: `/portal/*` pages

---

## Chart Components

Data visualization using Recharts and TradingView Lightweight Charts.

| Component | File | Purpose |
|-----------|------|---------|
| EquityCurve | `charts/equity-curve.tsx` | Equity curve line chart (Lightweight Charts) |
| PnlBarChart | `charts/pnl-bar-chart.tsx` | Monthly P&L bar chart (Recharts) |
| CumulativePnl | `charts/cumulative-pnl.tsx` | Cumulative P&L line (Recharts) |
| WinRateBar | `charts/win-rate-bar.tsx` | Win/loss ratio bar |
| StrategyDonut | `charts/strategy-donut.tsx` | Strategy distribution donut chart |
| MonthlyCalendar | `charts/monthly-calendar.tsx` | Trading calendar heatmap |
| ScannerHeatmap | `charts/scanner-heatmap.tsx` | Market scanner heatmap |
| HourlyHeatmap | `charts/hourly-heatmap.tsx` | Hour-of-day performance heatmap |
| ChartEmptyState | `charts/chart-empty-state.tsx` | Empty chart placeholder |

---

## Trading Components

Trading-specific UI elements.

| Component | File | Purpose |
|-----------|------|---------|
| PriceChart | `trading/price-chart.tsx` | TradingView Lightweight Charts price display |
| SymbolSelector | `trading/symbol-selector.tsx` | Trading pair selector dropdown |
| TimezoneSelector | `trading/timezone-selector.tsx` | Timezone picker for trading hours |
| PaperModeBadge | `trading/paper-mode-badge.tsx` | Paper/live mode indicator |
| RateLimitStatus | `trading/rate-limit-status.tsx` | API rate limit status indicator |
| NewsWidget | `trading/news-widget.tsx` | Market news feed widget |

---

## CMS Components

Content management system components.

| Component | File | Purpose |
|-----------|------|---------|
| BannerBar | `cms/banner-bar.tsx` | Top/bottom banner display |
| PopupManager | `cms/popup-manager.tsx` | Popup trigger + display manager |
| DynamicSection | `cms/dynamic-section.tsx` | CMS-driven dynamic content section |
| ImageUpload | `cms/image-upload.tsx` | Image upload with drag-and-drop |
| PageHeader (CMS) | `cms/page-header.tsx` | CMS content page header |
| ReorderButtons | `cms/reorder-buttons.tsx` | Sort order up/down buttons |
| GenerateEnglishButton | `cms/generate-english-button.tsx` | AI translate-to-English trigger |

---

## Registration Components

Customer registration flow.

| Component | File | Purpose |
|-----------|------|---------|
| RegisterOrchestrator | `register/register-orchestrator.tsx` | Multi-step registration wizard controller |
| SignupWizard | `register/signup-wizard.tsx` | Step-by-step signup form |
| ServicePicker | `register/service-picker.tsx` | Product/service selector (signal, crypto, VPS) |
| LeadForm | `register/lead-form.tsx` | Pre-registration lead capture |
| CryptoTierGate | `register/crypto-tier-gate.tsx` | Crypto tier selection + equity-based recommendation |
| InstitutionalBooking | `register/institutional-booking.tsx` | Institutional client booking form |

---

## Shared Components

Cross-cutting components used on multiple surfaces.

| Component | File | Purpose |
|-----------|------|---------|
| TrustStrip | `shared/trust-strip.tsx` | Trust indicators (security badges, certifications) |
| StatsBar | `shared/stats-bar.tsx` | Key metrics bar (AUM, users, win rate) |
| FaqAccordion | `shared/faq-accordion.tsx` | FAQ section with smooth accordion |

---

## Other Component Groups

| Group | Components | Purpose |
|-------|------------|---------|
| **Landing** | `landing/editorial-showcase.tsx`, `landing/ai-brain-section.tsx`, `landing-client.tsx` | Landing page sections |
| **Pricing** | `pricing/tier-comparison-matrix.tsx`, `pricing/capability-ladder.tsx` | Pricing display components |
| **Icons** | `icons/enterprise-icons.tsx`, `icons/strategy-icons.tsx` | Custom icon sets |
| **Tiers** | `tiers/tier-badge.tsx`, `tiers/tier-gate.tsx` | Tier display + access gate |
| **Notifications** | `notifications/notification-card.tsx` | Notification display card |
| **Analytics** | `analytics/pageview-tracker.tsx`, `analytics/web-vitals.tsx` | Client-side tracking |
| **Forms** | `forms/contact-form.tsx` | Contact/inquiry form |
| **Solutions** | `solutions/decision-quiz.tsx` | Product recommendation quiz |
| **Demo** | `demo/demo-cta-button.tsx` | Demo activation CTA |
| **Diagrams** | `diagrams/architecture-diagram.tsx` | System architecture visualization |
| **Providers** | `providers/theme-provider.tsx` | Theme context provider (next-themes) |
| **Error** | `error/forbidden-page.tsx` | 403 forbidden page |
