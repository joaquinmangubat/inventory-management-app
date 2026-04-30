# UI/UX Plan — Inventory Management System

## Context

The technical specification defines a web app replacing Google Sheets for shared inventory across Business A and Business B. This plan maps every spec requirement to concrete screens, components, navigation, and interaction patterns to ensure full coverage before implementation begins.

Tech stack: Next.js 14 (App Router), Tailwind CSS + shadcn/ui, TanStack Query, React Hook Form + Zod, Recharts.

---

## 1. Screen Inventory (27 screens)

### Authentication (6 screens)

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| A1 | Email Entry | `/login` | Email input, "Continue" button, app logo. No signup link (accounts created by owners). |
| A2 | PIN Entry | `/login/pin` | Shows user's name, 4-6 masked digit fields, `inputMode="numeric"` for mobile keypad. |
| A3 | Password Entry | `/login/password` | Shows user's name, password field with show/hide toggle. |
| A4 | Force PIN Change | `/change-pin` | No navigation/back button. New PIN + confirm PIN. Blocks access until completed. |
| A5 | Force Password Change | `/change-password` | Same pattern as A4 with password strength indicator. |
| A6 | Session Timeout Warning | Modal overlay | Appears ~5 min before 90-min timeout. Countdown + "Stay Signed In" / "Sign Out" buttons. Auto-redirects on expiry. |

**Login flow**: Email → API lookup returns `auth_type` → show PIN or password screen → authenticate → if `must_change_*` is true, force credential change → Dashboard.

### Dashboard (1 screen)

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| D1 | Dashboard | `/dashboard` | Primary landing. Search bar, category/sort filters, stock summary bar (total items, low stock count, expiring count, total value), item card grid with status indicators, collapsible "Expiring Soon" section, collapsible "Inactive Items" section at bottom. |

**Item Card contents**: Item name, category badge, business badge (red/green), stock level + unit, stock value (PHP), stock status indicator (green/yellow/red), reorder level progress bar, earliest expiry indicator (amber/red, only for items with `tracks_expiration=true`), last transaction info.

**Expiring Soon section**: Collapsible, between summary bar and item grid. Only renders if any tracked items have batches expiring within `expiry_alert_days` threshold or already expired. Red entries for expired items (with "Submit Adjustment" link to `/adjustments/new?itemId=...&reason=Expired`), amber for expiring soon (with "Use first" FIFO guidance). Sorted: expired first, then by soonest date. Filtered to active items with stock > 0.

**Inactive Items section**: Collapsible, only renders if count > 0. Lists deactivated items. Owner sees "Reactivate" button per item; staff sees read-only list.

### Transactions (4 screens)

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| T1 | New Transaction | `/transactions/new` | Full-page form: item search combobox + category quick picks, quantity stepper (±) with direct input, business brand radio (red/green) with "Last used" hint (no pre-select), add/consume radio, **conditional expiration date picker** (shown when item has `tracks_expiration=true` AND type is "Add Stock"; required; min date = today), optional notes, cancel/submit. |
| T2 | Confirmation Modal | Overlay on T1 | Full-width brand color banner, item name, action summary, **expiration date** (if set), calculated new stock. If new stock < 0: yellow warning "Stock will go negative". If expiry within threshold: yellow warning "This batch expires in X days". Go Back / Confirm & Submit. |
| T3 | Transaction Success | Replaces T1 | Green success banner, brand bar, transaction summary, **expiration date** (if set), **Edit button with countdown timer** ("Edit (4:32 remaining)"), "Log Another Transaction" + "Back to Dashboard" buttons. |
| T4 | Edit Transaction | `/transactions/[id]/edit` | Pre-populated form. **Only editable**: business entity, quantity, **expiration date** (if applicable), notes. Item and type shown read-only. Countdown banner at top. Shows "Originally: {brand}" if business changed. |

**Quantity input rules**: Always require quantity (no defaults). If item has `allows_decimal: true`, step = 0.01; otherwise step = 1 and enforce integers.

### Transaction History (1 screen)

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| H1 | Transaction History | `/transactions` | Date range picker, business/type/item filters. Transaction cards show: type badge (green=add, red=consume, yellow=adjust), business badge, timestamp, item name, quantity change, stock after, **expiration date** (on "add" transactions, color-coded: green if >threshold, amber if within threshold, red if expired), user name, notes preview. Edit button if within 5-min window + own transaction. "Edited" badge if `edited_at` exists. Adjustment status shown (approved/rejected) with rejection reason if applicable. |

### Adjustments (3 screens)

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| ADJ1 | Submit Adjustment | `/adjustments/new` | Item selector, correction quantity, business brand, reason select (Damaged, Expired, Miscounted, Spillage, Other), required notes textarea. **Supports query param pre-population**: `/adjustments/new?itemId=...&reason=Expired` (linked from dashboard Expiring Soon section). |
| ADJ2 | Pending Adjustments Queue | `/adjustments/pending` | **Owner only.** List of pending adjustment cards: item, business badge, timestamp, reason badge, quantity, submitter name, notes, current stock. Approve / Reject buttons per card. Badge count in page header. |
| ADJ3 | Reject Reason Modal | Overlay on ADJ2 | Adjustment summary (read-only), optional rejection reason textarea, Cancel / Reject Adjustment buttons. |

**Staff visibility**: Staff see "X adjustments pending review" count in navigation badge — no access to ADJ2 details.

### Item Management (3 screens, owner only)

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| I1 | Item List | `/items` | DataTable: name, category, unit, stock, cost (PHP), reorder level, status, actions (edit, update price, deactivate/reactivate). Search + category filter + show-inactive toggle. "Add New Item" button. |
| I2 | Create/Edit Item | `/items/new`, `/items/[id]/edit` | Fields: description, category, unit of measure, `allows_decimal` switch, **`tracks_expiration` switch** (helper text: "Requires expiration date when adding stock. Shows expiry alerts on dashboard."), unit cost (PHP), reorder level, order code, primary business (optional: Business A/Bale/Shared), primary supplier, alt suppliers, notes. `is_active` switch on edit only. |
| I3 | Update Price Modal | Overlay on I1 | Current price display, new price input, info alert: "Existing transactions keep their recorded prices." Uses separate `PUT /api/items/:id/price` endpoint. |

### Reports (4 screens)

| ID | Screen | Route | Access | Description |
|----|--------|-------|--------|-------------|
| R1 | Reports Landing | `/reports` | All (filtered) | Tab selector shows only accessible reports. Staff sees Low Stock only. Owners see all tabs. Date range presets (This Week, This Month, Last 30 Days, Custom). |
| R2 | Consumption Report | `/reports/consumption` | **Owner only** | Filters: date range, business, category. Charts (Recharts): bar chart by business, pie by category, line over time. Detail data table below. CSV export button. |
| R3 | Low Stock Report | `/reports/low-stock` | All users | **Two tabs: "Low Stock" and "Expiring Items".** Low Stock tab: Summary cards (Critical, Low, Healthy counts), table sorted by severity. **Expiring Items tab**: Summary (X expired, Y expiring soon), table: item, category, earliest expiry date, days remaining/status badge (red=expired, amber=expiring soon), current stock. CSV export for both tabs. |
| R4 | Cost Allocation Report | `/reports/cost-allocation` | **Owner only** | Summary cards: Business A total (red), Bale total (green), combined. Bar chart by category. Detail table: category, Business A cost, Bale cost, total. CSV export. |

**Staff report access**: Staff navigating to `/reports` will land directly on the Low Stock report (no tab selector needed since only one report is available). Owner-only report routes return 403 for staff.

### Notifications (1 screen)

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| N1 | Notification Panel | Sheet (mobile) / Dropdown (desktop) | Triggered from bell icon. List of notifications with unread dot, icon, message text, timestamp. Notification types include: adjustment status, stock alerts, **expiring_soon** (amber icon, e.g., "Fresh Milk expires in 3 days"), **expired** (red icon, e.g., "Alaska Cream has expired stock — submit adjustment to write off"). "Mark as Read" per item, "Mark All as Read" at bottom. |

### User Management (2 screens, owner only)

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| U1 | User List | `/admin/users` | Table: name, email, role badge, status, last login, actions (edit, reset PIN/password, deactivate). "Add User" button. |
| U2 | Create/Edit User | `/admin/users/new`, `/admin/users/[id]/edit` | Name, email, role select (Staff/Owner), conditional: initial PIN for staff or initial password for owner (forced change on first login), `is_active` switch. |

### Category Management (1 screen, owner only)

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| C1 | Category Management | `/admin/categories` | List of categories with item counts. Add new category (inline form or modal). Edit category name. Reorder categories (drag or up/down buttons). Cannot delete categories with active items — show warning. |

### Settings (1 screen)

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| S1 | Settings | `/settings` | **All users**: display name (read-only), email (read-only), change PIN/password button. **Owner only**: session timeout, edit window minutes, require adjustment notes toggle, **expiry alert threshold (days)** (default 7, controls how early expiration warnings appear). App version / contact developer link. |

---

## 2. Navigation Structure

### Mobile (< 1024px): Bottom Tab Bar + Top Header

**Top header** (persistent):
```
[Logo]  [Page Title]  [Bell count]  [Avatar]
```

**Bottom tab bar** (5 tabs):
```
[Dashboard]  [New Txn]  [History]  [Reports]  [More]
   home      plus-circle  clock    bar-chart   menu
```

"More" opens a slide-up sheet:
- Item Management (owner only)
- Category Management (owner only)
- Pending Adjustments (owner only, with count badge)
- User Management (owner only)
- Settings
- Sign Out

### Desktop (>= 1024px): Left Sidebar

```
[App Logo + Name]
─────────────────────
Dashboard              (LayoutDashboard)
New Transaction        (PlusCircle) — accent highlight
Transaction History    (Clock)
Reports                (BarChart3)
─────────────────────
ADMIN (owner only)
Item Management        (Package)
Category Management    (Tags)
Pending Adjustments    (AlertCircle + badge)
User Management        (Users)
─────────────────────
Settings               (Settings)
─────────────────────
[User Avatar + Name]
[Sign Out]
```

Sidebar: 240px expanded / 64px collapsed. "New Transaction" visually emphasized as primary action.

### Navigation Rules
- Post-login → always redirect to `/dashboard`
- Owner-only sections (Items, Categories, Users, Pending Adjustments, Consumption/Cost reports) conditionally rendered by `user.role`
- Staff see adjustment pending count as badge but cannot access details
- Active route highlighted
- Desktop: breadcrumbs on nested pages (e.g., Reports > Consumption)

---

## 3. Responsive Breakpoint Strategy

| Breakpoint | Target | Layout Changes |
|------------|--------|----------------|
| Default (< 640px) | Phones | Single column, bottom tabs, full-width forms, tables → card lists, sheets slide from bottom |
| `sm` (640px) | Large phones | Item grid 2-col |
| `md` (768px) | Tablets | Forms max-w-xl centered, tables with horizontal scroll |
| `lg` (1024px) | Laptops | Sidebar nav replaces bottom tabs, item grid 3-col, full tables, modals as centered dialogs |
| `xl` (1280px) | Desktops | Item grid 4-col, expanded chart layouts |

### Mobile-specific concerns
- `env(safe-area-inset-bottom)` for notched devices
- Touch targets >= 44x44px (stepper buttons >= 48px)
- Virtual keyboard: `scrollIntoView` on input focus
- Confirmation modal renders as full-screen sheet on mobile, centered dialog on desktop

---

## 4. Color System

```
Brand:
  Business A:     red-600 (#DC2626) / red-50 bg
  Business B:   green-600 (#16A34A) / green-50 bg

Stock Status:
  Healthy:            green-600 / green-50 bg
  Low stock:          yellow-600 / yellow-50 bg
  Critical/Negative:  red-600 / red-50 bg

Expiration Status:
  OK (> threshold):   green-600 text
  Expiring soon:      amber-600 / amber-50 bg
  Expired:            red-600 / red-50 bg

Transaction Types:
  Add:                green badge
  Consume:            red badge
  Adjustment:         yellow badge

UI:
  Primary text:       slate-900
  Muted text:         slate-500
  Border:             slate-200
  Page background:    slate-50
  Card background:    white
```

**Rule**: Never use color alone — always pair with text labels or icons for accessibility (WCAG 2.1 AA).

---

## 5. State Management Map

### React Context (Global)
- **AuthContext**: `user`, `isOwner`, `login()`, `logout()`, `refreshSession()`
- **SessionTimeoutContext**: `showWarning`, `remainingSeconds`, `resetTimer()`

### TanStack Query (Server State)

| Data | staleTime | refetchOnFocus | Invalidated By |
|------|-----------|----------------|----------------|
| Items list | 30s | yes | Create/edit transaction, approve adjustment, update item/price |
| Expiring items | 2min | yes | Create transaction with expiry, approve "Expired" adjustment, toggle `tracks_expiration` |
| Quick picks | 5min | no | New transactions |
| Transactions list | 0 (always fresh) | yes | Create/edit transaction |
| Pending adjustments | 0 | yes | Approve/reject adjustment |
| Pending adj. count | 30s | yes | Approve/reject adjustment |
| Notification count | 15s | yes | Any mutation |
| Reports | 2min | no | — (user-triggered refresh) |
| Categories | 10min | no | — (rarely change) |

### Local State (useState)
- Form fields (managed by react-hook-form)
- Modal/sheet open states
- Edit countdown timer
- Filter selections (synced to URL params for shareability)

### URL State (searchParams)
```
/dashboard?category=dairy&sort=stock_asc&search=cream
/transactions?business=arcys&type=consume&from=2025-01-01&to=2025-01-31
```

---

## 6. Loading, Empty, and Error States

### Loading
- **Dashboard**: Skeleton grid (8 cards matching ItemCard dimensions)
- **Lists/Tables**: Skeleton rows (6 rows)
- **Forms**: Item selector dropdown shows skeleton lines while fetching
- **Reports**: Skeleton rectangle for chart area + skeleton table rows
- **Initial app load**: Centered spinner with app logo

### Empty States (illustration + message + CTA)
- **No items**: "No inventory items yet" → "Add First Item" (owner) / "Ask your manager" (staff)
- **No search results**: "No items found" → "Clear Filters"
- **No transactions**: "No transactions yet" → "Log a Transaction"
- **No expiring items**: "No items expiring soon" (checkmark icon, in dashboard Expiring Soon section and report tab)
- **No pending adjustments**: "All caught up!" (checkmark icon)
- **No notifications**: "You're all caught up"
- **No report data**: "No data for this period" → change date range

### Error States
- **API error**: Alert with "Something went wrong" + Retry button
- **Network error**: "Connection lost" + Retry
- **Session expired**: Auto-redirect to `/login` with toast
- **403 Forbidden**: "Access Denied" + "Go to Dashboard"
- **404 Not Found**: "Page Not Found" + "Go to Dashboard"
- **Form submission error**: Inline destructive alert above submit button
- **Edit window expired**: "The 5-minute edit window has passed" + link to history
- **Negative stock warning**: Yellow alert in confirmation modal (does not block submission)

### Toast Notifications
- Transaction created/edited → success
- Adjustment submitted/approved/rejected → success
- Item created/updated/deactivated/reactivated → success/info
- Price updated → success
- CSV export ready → success
- Session expired → warning
- API/network errors → error

---

## 7. Accessibility (WCAG 2.1 AA)

- Contrast: 4.5:1 minimum. Brand reds/greens chosen to pass on white.
- Keyboard: All interactive elements focusable, tab order = visual order, focus trap in modals, Escape closes dialogs.
- Screen readers: `aria-live="polite"` for stock changes, countdown (throttled), notification count. `aria-live="assertive"` for session timeout, critical alerts. `aria-required`, `aria-describedby` on form fields.
- Touch: Min 44x44px targets, 48px for stepper buttons, 8px gap between adjacent targets.
- `prefers-reduced-motion`: Disable chart animations, timer animations.
- Landmarks: `<header>`, `<nav>`, `<main>`, `<aside>` properly used.
- Skip-to-content link (hidden until focused).

---

## 8. Identified UI Gaps (Not in Spec)

These items are needed for a complete UI but are not explicitly defined in the technical specification:

| Gap | Resolution |
|-----|------------|
| **Category management** | **Add admin UI page** (`/admin/categories`) — owner only. Simple list + add/edit/reorder. See updated screen table below. |
| **Transaction detail page** | **Deferred to Phase 2.** Card in H1 shows sufficient info. No dedicated detail view in MVP. |
| **Report access control** | **Staff: Low Stock only.** Consumption and Cost Allocation are **owner-only**. Navigation conditionally hides restricted reports. |
| **404 / Not Found page** | Standard — design included above. |
| **403 / Forbidden page** | For staff accessing owner-only URLs directly. |
| **Global error boundary** | `error.tsx` for unhandled React errors. |
| **Staff adjustment notification** | Staff learn of approval/rejection via in-app notification that links to the transaction in H1. Adjustment status (approved/rejected + reason) visible on the transaction card. |
| **About/Version info** | Simple section in Settings page — app version, link to contact developer. |

---

## 9. File Structure

```
src/app/
  (auth)/
    login/page.tsx, pin/page.tsx, password/page.tsx
    change-pin/page.tsx, change-password/page.tsx
    layout.tsx                    — LoginLayout
  (main)/
    layout.tsx                    — AppShell (sidebar/tabs, header, session timeout)
    dashboard/page.tsx
    transactions/new/page.tsx, page.tsx, [id]/edit/page.tsx
    adjustments/new/page.tsx, pending/page.tsx
    reports/page.tsx, consumption/page.tsx, low-stock/page.tsx, cost-allocation/page.tsx
    items/page.tsx, new/page.tsx, [id]/edit/page.tsx
    admin/users/page.tsx, new/page.tsx, [id]/edit/page.tsx
    admin/categories/page.tsx
    settings/page.tsx
  not-found.tsx, error.tsx

src/components/
  layout/     — AppShell, Sidebar, BottomTabBar, TopHeader, PageHeader
  auth/       — EmailForm, PinInput, PasswordInput, SessionTimeoutDialog
  dashboard/  — ItemCard, ItemCardGrid, StockSummaryBar, StockStatusIndicator, ExpiringSoonSection, InactiveItemsSection
  transactions/ — ItemSelector, QuickPicks, QuantityInput, BusinessBrandSelector,
                  TransactionTypeToggle, ExpirationDatePicker, ConfirmationModal,
                  TransactionSuccessCard, EditCountdownTimer, TransactionCard, TransactionFilters
  adjustments/  — AdjustmentForm, AdjustmentCard, ApprovalActions, RejectReasonModal
  items/        — ItemForm, ItemTable, PriceUpdateModal
  reports/      — ConsumptionChart, LowStockTable, CostAllocationChart, ExportButton, DateRangeSelector
  notifications/ — NotificationBell, NotificationPanel, NotificationItem
  users/        — UserForm, UserTable
  shared/       — BusinessBadge, CategoryBadge, StockLevelBadge, CurrencyDisplay,
                  EmptyState, ErrorState, LoadingSkeleton, NegativeStockWarning
  ui/           — shadcn/ui components

src/hooks/    — useAuth, useSessionTimeout, useEditCountdown, useExpiringItems, useDebounce, useQueryParams
src/lib/      — api.ts, queries.ts, mutations.ts, validations.ts, utils.ts, constants.ts
src/providers/ — AuthProvider, SessionTimeoutProvider, QueryProvider
src/types/    — Shared TypeScript interfaces
```

---

## 10. Critical User Flows Summary

### Transaction Entry (most complex flow)
`T1 (form) → T2 (confirm modal) → API → T3 (success + countdown) → optional T4 (edit)`

### Adjustment Workflow
`ADJ1 (staff submits) → notification to owner → ADJ2 (owner reviews) → approve or ADJ3 (reject modal) → notification to staff → visible in H1`

### Login
`A1 (email) → API lookup → A2 (PIN) or A3 (password) → API auth → A4/A5 (force change if needed) → D1 (dashboard)`

---

## 11. Verification Checklist

After implementation, verify:
- [ ] All 27 screens render and function correctly (including expiration tracking enhancements)
- [ ] Mobile bottom tab nav + desktop sidebar both work
- [ ] Transaction flow: form → confirm → success → edit countdown → edit
- [ ] Adjustment flow: submit → pending queue → approve/reject → notification
- [ ] Business brand color coding consistent throughout (red/green)
- [ ] Stock status indicators: green (healthy), yellow (low), red (critical/negative)
- [ ] Expiration date picker: shown only for tracked items + "Add Stock", required, min date = today
- [ ] Dashboard "Expiring Soon" section: shows expired (red) and expiring (amber) items correctly
- [ ] Expiration dates color-coded in transaction history (green/amber/red)
- [ ] Item form: `tracks_expiration` toggle works and persists
- [ ] Expiring items tab in low stock report shows correct data
- [ ] Expiry alert threshold configurable in settings (owner only)
- [ ] Expiring/expired notification types render correctly in notification panel
- [ ] Negative stock allowed but shows warning — does not block
- [ ] 5-minute edit window countdown works and blocks after expiry
- [ ] Owner-only routes inaccessible to staff (redirects/403)
- [ ] Staff sees only Low Stock report; Consumption and Cost Allocation hidden
- [ ] Category management: create, edit, reorder categories (owner only)
- [ ] Categories with active items cannot be deleted
- [ ] Session timeout at 90 minutes with warning dialog
- [ ] All forms validate with Zod and show inline errors
- [ ] Empty states, loading skeletons, error states all present
- [ ] Responsive at all breakpoints (phone, tablet, desktop)
- [ ] Keyboard navigable, screen-reader friendly
- [ ] CSV export works from all report pages
